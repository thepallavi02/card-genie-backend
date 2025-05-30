import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthenticateRequestDto, AuthenticateResponseDto } from '../dto/authenticate.dto';
import { UploadDocResponseDto } from '../dto/upload-doc.dto';
import { QuestionnaireRequestDto, QuestionnaireResponseDto } from '../dto/questionnaire.dto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../schemas/user.schema';
import { DocumentUpload, DocumentUploadDocument } from '../schemas/document.schema';
import { Questionnaire, QuestionnaireDocument } from '../schemas/questionnaire.schema';
import { StatementAnalysis, StatementAnalysisDocument } from '../schemas/statement-analysis.schema';

@Injectable()
export class CreditCardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(DocumentUpload.name)
    private documentModel: Model<DocumentUploadDocument>,
    @InjectModel(Questionnaire.name)
    private questionnaireModel: Model<QuestionnaireDocument>,
    @InjectModel(StatementAnalysis.name)
    private statementAnalysisModel: Model<StatementAnalysisDocument>,
    private readonly configService: ConfigService,
  ) {}

  async authenticate(
    authenticateDto: AuthenticateRequestDto,
  ): Promise<AuthenticateResponseDto> {
    // For now, we return isValidLink as true for all GPs as mentioned in the requirements
    const customerId = uuidv4();

    // Create a new user in the database
    await this.userModel.create({
      customerId,
      token: authenticateDto.token,
    });

    const authToken = this.configService.get<string>('AUTH_TOKEN');
    return {
      isValidLink: true,
      apiToken: authToken,
      customerId,
    };
  }

  async uploadDoc(
    files: Express.Multer.File[],
    cardBank: string,
    cardName: string,
    customerId: string,
  ): Promise<UploadDocResponseDto> {
    // Store information about all uploaded files in a single database entry
    const documentIds: string[] = [];

    // Find the user by customerId
    const user = await this.userModel.findOne({ customerId });
    if (!user) {
      throw new Error(`User with customerId ${customerId} not found`);
    }

    // Get all file paths
    const filePaths = files.map(file => file.path);

    // Create a single document with all file paths
    const document = await this.documentModel.create({
      user: user._id,
      cardBank,
      cardName,
      filePaths: filePaths,
      // In a real implementation, we would call Bedrock API here
      // and store the response in bedrockResponse field
      bedrockResponse: { status: 'processed' },
    });

    documentIds.push(document._id.toString());

    return {
      message: 'PDFs uploaded successfully',
      documentIds,
    };
  }

  async submitQuestionnaire(
    questionnaireDto: QuestionnaireRequestDto,
    customerId: string,
  ): Promise<QuestionnaireResponseDto> {
    // Find the user by customerId
    const user = await this.userModel.findOne({ customerId });
    if (!user) {
      throw new Error(`User with customerId ${customerId} not found`);
    }

    // Store the questionnaire data in the database
    const questionnaire = await this.questionnaireModel.create({
      customerId: user.customerId,
      spendCategory: questionnaireDto.spendCategory,
      incomeRange: questionnaireDto.incomeRange,
      hasCreditCard: questionnaireDto.hasCreditCard,
      creditLimit: questionnaireDto.creditLimit,
    });

    return {
      message: 'questionnaire submitted successfully',
      id: questionnaire._id.toString(),
    };
  }

  async saveStatementAnalysis(
    analysisData: any,
    documentId: string,
    customerId: string,
  ): Promise<string> {
    // Find the document by ID
    const document = await this.documentModel.findById(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Convert snake_case to camelCase for the analysis data
    const basicFeatures = {
      creditLimit: analysisData.basic_features.credit_limit,
      // availableCredit: analysisData.basic_features.available_credit,
      // cashLimit: analysisData.basic_features.cash_limit,
      // availableCash: analysisData.basic_features.available_cash,
      // creditUtilizationRatio:
      //   analysisData.basic_features.credit_utilization_ratio,
      // totalAmountDue: analysisData.basic_features.total_amount_due,
      // minimumAmountDue: analysisData.basic_features.minimum_amount_due,
      // rewardPoints: analysisData.basic_features.reward_points,
      // bankName: analysisData.basic_features.bank_name,
      // cardType: analysisData.basic_features.card_type,
      // statementDate: analysisData.basic_features.statement_date,
      // paymentDueDate: analysisData.basic_features.payment_due_date,
    };

    const transactionMetrics = {
      transactionCount: analysisData.transaction_metrics.transaction_count,
      totalSpend: analysisData.transaction_metrics.total_spend,
      averageTransactionAmount:
        analysisData.transaction_metrics.average_transaction_amount,
      largestTransaction: analysisData.transaction_metrics.largest_transaction,
      smallestTransaction:
        analysisData.transaction_metrics.smallest_transaction,
    };

    // Convert category breakdown
    const categoryBreakdown = {};
    for (const [category, details] of Object.entries(
      analysisData.category_breakdown,
    )) {
      categoryBreakdown[category] = {
        amount: (details as any).amount,
        percentage: (details as any).percentage,
        count: (details as any).count,
      };
    }

    // Convert transactions
    // const transactions = analysisData.transactions.map((transaction) => ({
    //   date: transaction.date,
    //   merchant: transaction.merchant,
    //   amount: transaction.amount,
    //   category: transaction.category,
    // }));

    // const userPersonaIndicators = {
    //   highSpender: analysisData.user_persona_indicators.high_spender,
    //   rewardOptimizer: analysisData.user_persona_indicators.reward_optimizer,
    //   digitalNative: analysisData.user_persona_indicators.digital_native,
    //   foodEnthusiast: analysisData.user_persona_indicators.food_enthusiast,
    //   travelLover: analysisData.user_persona_indicators.travel_lover,
    //   shopper: analysisData.user_persona_indicators.shopper,
    //   entertainmentSeeker:
    //     analysisData.user_persona_indicators.entertainment_seeker,
    //   healthConscious: analysisData.user_persona_indicators.health_conscious,
    //   familyOriented: analysisData.user_persona_indicators.family_oriented,
    //   techSavvy: analysisData.user_persona_indicators.tech_savvy,
    // };

    // const financialBehavior = {
    //   utilizationLevel: analysisData.financial_behavior.utilization_level,
    //   paymentBehavior: analysisData.financial_behavior.payment_behavior,
    //   spendingPattern: analysisData.financial_behavior.spending_pattern,
    // };

    // Create the statement analysis
    const statementAnalysis = await this.statementAnalysisModel.create({
      user: document.user,
      document: document._id,
      basicFeatures,
      transactionMetrics,
      categoryBreakdown,
      // transactions,
      topCategories: analysisData.top_categories,
      // userPersonaIndicators,
      // financialBehavior,
      analyzedAt: new Date(),
    });

    return statementAnalysis._id.toString();
  }
}
