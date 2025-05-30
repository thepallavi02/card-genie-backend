import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ProcessingResult } from '../interfaces/credit-card-analyzer.interface';
import * as fs from 'fs';
import * as path from 'path';
import { MongoClient } from 'mongodb';
import { CreditCardAnalysis } from '../schemas/credit-card-crawler-data';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CrawlerAnalyzerService {
  private readonly logger = new Logger(CrawlerAnalyzerService.name);
  private readonly mongoClient: MongoClient;
  private readonly BATCH_SIZE = 1;

  constructor(
    private readonly geminiService: GeminiService,
    @InjectModel(CreditCardAnalysis.name)
    private creditCardAnalysis: Model<CreditCardAnalysis>,
  ) {
    // Initialize MongoDB client
  }

  async analyzePdfFile(pdfPath: string): Promise<ProcessingResult> {
    try {
      this.logger.log(`Starting analysis of PDF: ${pdfPath}`);

      // Upload PDF file to Gemini
      const fileData = await this.geminiService.uploadPdfFile(pdfPath);

      // Get extraction prompt
      const prompt = this.geminiService.getExtractionPrompt();

      // Analyze with Gemini
      const rawResult = await this.geminiService.analyzeWithGemini(
        fileData,
        prompt,
      );

      // Validate and clean response
      const cleanedResult =
        this.geminiService.validateAndCleanResponse(rawResult);

      // Store in database
      await this.storeInDatabase(cleanedResult);

      this.logger.log(`Successfully analyzed PDF: ${pdfPath}`);
      return cleanedResult;
    } catch (error) {
      this.logger.error(`Error analyzing PDF ${pdfPath}: ${error.message}`);
      throw new Error(`PDF analysis failed: ${error.message}`);
    }
  }

  async processDirectory(directoryPath: string): Promise<ProcessingResult[]> {
    try {
      this.logger.log(`Processing directory: ${directoryPath}`);

      if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory not found: ${directoryPath}`);
      }

      const files = fs
        .readdirSync(directoryPath)
        .filter((file) => path.extname(file).toLowerCase() === '.pdf')
        .map((file) => path.join(directoryPath, file));

      if (files.length === 0) {
        this.logger.warn(`No PDF files found in directory: ${directoryPath}`);
        return [];
      }

      this.logger.log(`Found ${files.length} PDF files to process`);

      const results: ProcessingResult[] = [];
      const totalBatches = Math.ceil(files.length / this.BATCH_SIZE);

      // Process files in batches
      for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
        const batch = files.slice(i, i + this.BATCH_SIZE);
        this.logger.log(`Processing batch ${batchNumber} of ${totalBatches}`);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (pdfPath) => {
            try {
              const result = await this.analyzePdfFile(pdfPath);
              return result;
            } catch (error) {
              this.logger.error(
                `Failed to process ${pdfPath}: ${error.message}`,
              );
              return null;
            }
          }),
        );

        // Add delay between batches
        if (i + this.BATCH_SIZE < files.length) {
          await this.delay(2000);
        }
      }

      this.logger.log(
        `Successfully processed ${results.length} out of ${files.length} PDF files`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Error processing directory ${directoryPath}: ${error.message}`,
      );
      throw new Error(`Directory processing failed: ${error.message}`);
    }
  }

  async saveResultsToJson(
    results: ProcessingResult[],
    outputPath: string,
  ): Promise<void> {
    try {
      this.logger.log(`Saving results to JSON file: ${outputPath}`);

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const jsonData = JSON.stringify(results, null, 2);
      fs.writeFileSync(outputPath, jsonData, 'utf-8');

      this.logger.log(`Results saved successfully to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Error saving results to JSON: ${error.message}`);
      throw new Error(`JSON save failed: ${error.message}`);
    }
  }

  private async storeInDatabase(result: ProcessingResult): Promise<void> {
    try {
      this.logger.log('Storing analysis results in database');

      const analysis = new this.creditCardAnalysis({
        cardName: result['cardName'],
        bankName: '',
        eligibilityCriteria: result.eligibilityCriteria,
        rewardSummary: result.rewardSummary,
        benefits: result.benefits,
        feesAndCharges: result.feeStructure,
        analyzedAt: new Date(),
      });

      await this.creditCardAnalysis.create(analysis);

      this.logger.log('Successfully stored analysis results in database');
    } catch (error) {
      this.logger.error(`Failed to store analysis results: ${error.message}`);
      throw new Error(`Database storage failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
