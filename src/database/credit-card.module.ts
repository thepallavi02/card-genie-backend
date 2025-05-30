import { Module } from '@nestjs/common';
import { CreditCardController } from '../credit-card/controllers/credit-card.controller';
import { CreditCardService } from '../credit-card/services/credit-card.service';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../credit-card/schemas/user.schema';
import {
  DocumentUpload,
  DocumentUploadSchema,
} from '../credit-card/schemas/document.schema';
import {
  Questionnaire,
  QuestionnaireSchema,
} from '../credit-card/schemas/questionnaire.schema';
import {
  StatementAnalysis,
  StatementAnalysisSchema,
} from '../credit-card/schemas/statement-analysis.schema';
import { StatementAnalyzerService } from '../credit-card/services/statement-analyzer.service';
import { StatementAnalyzerController } from '../credit-card/controllers/statement-analyzer.controller';
import { AnalyzeService } from '../credit-card/services/analyzer.service';
import { CrawlerAnalyzerService } from '../credit-card/services/crawler-analyzer.service';
import { GeminiService } from '../credit-card/services/gemini.service';
import {CreditCardAnalysis, CreditCardAnalysisSchema} from "../credit-card/schemas/credit-card-crawler-data";

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DocumentUpload.name, schema: DocumentUploadSchema },
      { name: Questionnaire.name, schema: QuestionnaireSchema },
      { name: StatementAnalysis.name, schema: StatementAnalysisSchema },
      { name: CreditCardAnalysis.name, schema: CreditCardAnalysisSchema },
    ]),
  ],
  controllers: [CreditCardController, StatementAnalyzerController],
  providers: [
    CreditCardService,
    StatementAnalyzerService,
    AnalyzeService,
    CrawlerAnalyzerService,
    GeminiService,
  ],
})
export class CreditCardModule {}
