import { Controller, Post, Param, UseGuards, BadRequestException, Logger, UploadedFile, UseInterceptors } from '@nestjs/common';
import { StatementAnalyzerService } from '../services/statement-analyzer.service';
import { AnalyzeStatementResponseDto } from '../dto/analyze-statement.dto';
import { AnalyzeService } from '../services/analyzer.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

@Controller('statement-analyzer')
export class StatementAnalyzerController {
  private readonly logger = new Logger(StatementAnalyzerController.name);

  constructor(
    private readonly statementAnalyzerService: StatementAnalyzerService,
    private readonly analyzer: AnalyzeService
  ) {}

  /**
   * Analyzes a credit card statement PDF file
   * @param file The PDF file to analyze
   * @returns The analysis results
   */
  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('file', {
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
  async analyzeStatement(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AnalyzeStatementResponseDto> {
    try {
      if (!file) {
        throw new BadRequestException('No PDF file uploaded');
      }

      this.logger.log(`Received file: ${file.originalname}, size: ${file.size} bytes, mimetype: ${file.mimetype}`);
      
      // Read the file from disk
      const fileBuffer = fs.readFileSync(file.path);
      this.logger.log(`Read file from disk: ${file.path}`);

      if (!fileBuffer) {
        this.logger.error('Failed to read file from disk');
        throw new BadRequestException('Failed to read file from disk');
      }

      this.logger.log(`Buffer size: ${fileBuffer.length} bytes`);

      const pdfText = await this.analyzer.extractTextFromPdf(fileBuffer);
      const prompt = this.analyzer.getExtractionPrompt(pdfText);
      const response = await this.analyzer.analyzeWithGroq(prompt);

      // Clean up: delete the temporary file
      fs.unlinkSync(file.path);
      this.logger.log(`Deleted temporary file: ${file.path}`);

      return this.analyzer.validateAndCleanResponse(response);
    } catch (error) {
      this.logger.error(`Error analyzing statement: ${error.message}`, error.stack);
      throw error;
    }
  }
}
