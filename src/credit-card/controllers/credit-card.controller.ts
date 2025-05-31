import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Headers,
  BadRequestException,
  Logger,
  UploadedFile,
  InternalServerErrorException,
  Get,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreditCardService } from '../services/credit-card.service';
import {
  AuthenticateRequestDto,
  AuthenticateResponseDto,
} from '../dto/authenticate.dto';
import {
  UploadDocRequestDto,
  UploadDocResponseDto,
} from '../dto/upload-doc.dto';
import {
  QuestionnaireRequestDto,
  QuestionnaireResponseDto,
} from '../dto/questionnaire.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { AnalyzeService } from '../services/analyzer.service';
import { ProcessingResult } from '../interfaces/credit-card-analyzer.interface';
import { GeminiService } from '../services/gemini.service';
import { CrawlerAnalyzerService } from '../services/crawler-analyzer.service';
import { GetRecommendationRequestDto} from '../dto/recommendation.dto';
import OpenAI from "openai";
import * as process from "node:process";


@Controller()
export class CreditCardController {
  private readonly logger = new Logger(CreditCardController.name);
  constructor(
    private readonly creditCardService: CreditCardService,
    private readonly configService: ConfigService,
    private readonly analyzer: AnalyzeService,
    private readonly analyzerService: CrawlerAnalyzerService,
  ) {}

  @Post('authenticate')
  async authenticate(
    @Body() authenticateDto: AuthenticateRequestDto,
  ): Promise<AuthenticateResponseDto> {
    return await this.creditCardService.authenticate(authenticateDto);
  }

  @Post('recommendation')
  @UseInterceptors(
      FilesInterceptor('files', 5, {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${uniqueSuffix}-${file.originalname}`);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
        },
        fileFilter: (req, file, callback) => {
          if (!file) {
            return callback(new BadRequestException('No file uploaded'), false);
          }
          if (file.mimetype !== 'application/pdf') {
            return callback(new BadRequestException('Only PDF files are allowed'), false);
          }
          callback(null, true);
        },
      }),
  )
  async getRecommendationByDoc(
      @UploadedFiles() files: Express.Multer.File[],
      @Body() uploadDocDto: UploadDocRequestDto,
      @Headers('authorization') authorization: string,
  ): Promise<UploadDocResponseDto> {


    console.log("body", uploadDocDto)

    const authToken = this.configService.get<string>('AUTH_TOKEN');
    if (!authorization || authorization !== authToken) {
      throw new BadRequestException('Invalid or missing authorization token');
    }

    // Check if customerId or customerUuid is provided
    const customerId = uploadDocDto.customerId;
    if (!customerId) {
      throw new BadRequestException('customerId is required. Please include the customerId from the authentication response.');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No PDF files uploaded');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 PDF files can be uploaded at once');
    }

    // Upload documents to database
    const uploadResult = await this.creditCardService.uploadDoc(
        files,
        uploadDocDto.cardBank || 'Unknown',
        uploadDocDto.cardName || 'Unknown',
        customerId
    );

    const documentId = uploadResult.documentIds[0];
    this.logger.log(`Documents uploaded with ID: ${documentId}`);

    // Process all PDF files and combine their text
    let combinedText = '';
    const openAiFile = []
    const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBuffer = fs.readFileSync(file.path);

      const fileData = await client.files.create({
        file: fs.createReadStream(file.path),
        purpose: "user_data",
      });

      openAiFile.push({
        "type":"input_file",
        "file_id":fileData.id
      })

      if (!fileBuffer) {
        this.logger.error(`Failed to read file from disk: ${file.path}`);
        continue;
      }

      try {
        const pdfText = await this.analyzer.extractTextFromPdf(fileBuffer);
        combinedText +=`\n\n=== CREDIT CARD STATEMENT ${i+1} ===\n` ;
        combinedText += `Source: ${file.path}\n`;
        combinedText += `${pdfText}\n`;
        combinedText += `=== END OF STATEMENT ${i+1} ===\n\n`;
      } catch (error) {
        this.logger.error(`Error extracting text from PDF ${file.path}: ${error.message}`);
      }

      // Clean up the file after processing
      fs.unlinkSync(file.path);
    }

    if (!combinedText) {
      throw new BadRequestException('Failed to extract text from any of the uploaded PDFs');
    }

    const prompt = this.analyzer.getExtractionPrompt(combinedText);

    openAiFile.push({
      "type": "input_text",
      "text": prompt,
    })
    const responseData:any = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: openAiFile,
        },
      ],
    });

    // Clean and validate the response
    const cleanedResponse = this.analyzer.validateAndCleanResponse(JSON.parse(responseData.output[0].content[0].text));

    // Save the analysis response to the database
    try {
      const analysisId = await this.creditCardService.saveStatementAnalysis(cleanedResponse, documentId, customerId);
      this.logger.log(`Statement analysis saved with ID: ${analysisId}`);
    } catch (error) {
      this.logger.error(`Failed to save statement analysis: ${error.message}`);
      // Continue even if saving fails, to ensure the user gets a response
    }

    return cleanedResponse;
  }

  @Post('questionnaire')
  async submitQuestionnaire(
    @Body() questionnaireDto: QuestionnaireRequestDto,
  ): Promise<QuestionnaireResponseDto> {
    // Check if customerId is provided
    if (!questionnaireDto.customerId) {
      throw new BadRequestException(
        'customerId is required. Please include the customerId from the authentication response.',
      );
    }

    return await this.creditCardService.submitQuestionnaire(
      questionnaireDto,
      questionnaireDto.customerId,
    );
  }

  @Post('analyze-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async analyzeFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProcessingResult> {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    try {
      this.logger.log(`Analyzing uploaded file: ${file.originalname}`);
      const result = await this.analyzerService.analyzePdfFile(file.path);

      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return result;
    } catch (error) {
      this.logger.error(`File analysis failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to analyze PDF file');
    }
  }

  @Post('analyze-directory')
  async analyzeDirectory(
    @Body()
    body: {
      directoryPath: string;
    },
  ) {
    const { directoryPath } = body;

    if (!directoryPath) {
      throw new BadRequestException('Directory path is required');
    }

    try {
      this.logger.log(`Analyzing directory: ${directoryPath}`);
      const results = await this.analyzerService.processDirectory(
        directoryPath,
      );

      return results;
    } catch (error) {
      this.logger.error(`Directory analysis failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to analyze directory');
    }
  }

  @Post('save-results')
  async saveResults(
    @Body() body: { results: ProcessingResult[]; outputPath: string },
  ) {
    const { results, outputPath } = body;

    if (!results || !outputPath) {
      throw new BadRequestException('Results and output path are required');
    }

    try {
      await this.analyzerService.saveResultsToJson(results, outputPath);
      return {
        success: true,
        message: `Results saved to ${outputPath}`,
        totalRecords: results.length,
      };
    } catch (error) {
      this.logger.error(`Save results failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to save results');
    }
  }

  @Get('extract-prompt')
  async getExtractionPrompt() {
    // This can be useful for testing or documentation purposes
    const geminiService = new GeminiService();
    return {
      prompt: geminiService.getExtractionPrompt(),
    };
  }

  @Post('get-recommendations')
  async getRecommendations(
    @Body() request: GetRecommendationRequestDto,
  ): Promise<any> {
    const authToken = this.configService.get<string>('AUTH_TOKEN');

    try {
      this.logger.log(`Getting recommendations for customer: ${request.customerId}`);
      const recommendations = await this.creditCardService.getRecommendations(request);
      return recommendations;
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error.message}`);
      throw new InternalServerErrorException('Failed to get recommendations');
    }
  }
}
