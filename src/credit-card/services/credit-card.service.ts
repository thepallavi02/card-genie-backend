import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {
    AuthenticateRequestDto,
    AuthenticateResponseDto,
} from '../dto/authenticate.dto';
import {UploadDocResponseDto} from '../dto/upload-doc.dto';
import {
    QuestionnaireRequestDto,
    QuestionnaireResponseDto,
} from '../dto/questionnaire.dto';
import {v4 as uuidv4} from 'uuid';
import {User, UserDocument} from '../schemas/user.schema';
import {
    DocumentUpload,
    DocumentUploadDocument,
} from '../schemas/document.schema';
import {
    Questionnaire,
    QuestionnaireDocument,
} from '../schemas/questionnaire.schema';
import {
    StatementAnalysis,
    StatementAnalysisDocument,
} from '../schemas/statement-analysis.schema';
import {
    CreditCardAnalysis,
    CreditCardAnalysisDocument,
} from '../schemas/credit-card-crawler-data';
import {Groq} from 'groq-sdk';
import {GeminiService} from './gemini.service';
import {GetRecommendationRequestDto} from '../dto/recommendation.dto';

@Injectable()
export class CreditCardService {
    private readonly logger = new Logger(CreditCardService.name);
    private readonly groqClient: Groq;
    private readonly groqModel = 'deepseek-r1-distill-llama-70b';

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(DocumentUpload.name)
        private documentModel: Model<DocumentUploadDocument>,
        @InjectModel(Questionnaire.name)
        private questionnaireModel: Model<QuestionnaireDocument>,
        @InjectModel(StatementAnalysis.name)
        private statementAnalysisModel: Model<StatementAnalysisDocument>,
        @InjectModel(CreditCardAnalysis.name)
        private creditCardAnalysisModel: Model<CreditCardAnalysisDocument>,
        private readonly configService: ConfigService,
        private readonly geminiService: GeminiService,
    ) {
        const groqApiKey = this.configService.get<string>('GROQ_API_KEY');
        this.groqClient = new Groq({
            apiKey: groqApiKey,
        });
    }

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
        // Store information about each uploaded file in the database
        const documentIds: string[] = [];

        // Find the user by customerId
        const user = await this.userModel.findOne({customerId});
        if (!user) {
            throw new Error(`User with customerId ${customerId} not found`);
        }

        for (const file of files) {
            const document = await this.documentModel.create({
                user: user._id,
                cardBank,
                cardName,
                filePath: file.path,
                // In a real implementation, we would call Bedrock API here
                // and store the response in bedrockResponse field
                bedrockResponse: {status: 'processed'},
            });

            documentIds.push(document._id.toString());
        }

        return {
            message: 'PDF uploaded successfully',
            documentIds,
        };
    }

    async submitQuestionnaire(
        questionnaireDto: QuestionnaireRequestDto,
        customerId: string,
    ): Promise<QuestionnaireResponseDto> {
        // Find the user by customerId
        const user = await this.userModel.findOne({customerId});
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
            availableCredit: analysisData.basic_features.available_credit,
            cashLimit: analysisData.basic_features.cash_limit,
            availableCash: analysisData.basic_features.available_cash,
            creditUtilizationRatio:
            analysisData.basic_features.credit_utilization_ratio,
            totalAmountDue: analysisData.basic_features.total_amount_due,
            minimumAmountDue: analysisData.basic_features.minimum_amount_due,
            rewardPoints: analysisData.basic_features.reward_points,
            bankName: analysisData.basic_features.bank_name,
            cardType: analysisData.basic_features.card_type,
            statementDate: analysisData.basic_features.statement_date,
            paymentDueDate: analysisData.basic_features.payment_due_date,
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
        const transactions = analysisData.transactions.map((transaction) => ({
            date: transaction.date,
            merchant: transaction.merchant,
            amount: transaction.amount,
            category: transaction.category,
        }));

        const userPersonaIndicators = {
            highSpender: analysisData.user_persona_indicators.high_spender,
            rewardOptimizer: analysisData.user_persona_indicators.reward_optimizer,
            digitalNative: analysisData.user_persona_indicators.digital_native,
            foodEnthusiast: analysisData.user_persona_indicators.food_enthusiast,
            travelLover: analysisData.user_persona_indicators.travel_lover,
            shopper: analysisData.user_persona_indicators.shopper,
            entertainmentSeeker:
            analysisData.user_persona_indicators.entertainment_seeker,
            healthConscious: analysisData.user_persona_indicators.health_conscious,
            familyOriented: analysisData.user_persona_indicators.family_oriented,
            techSavvy: analysisData.user_persona_indicators.tech_savvy,
        };

        const financialBehavior = {
            utilizationLevel: analysisData.financial_behavior.utilization_level,
            paymentBehavior: analysisData.financial_behavior.payment_behavior,
            spendingPattern: analysisData.financial_behavior.spending_pattern,
        };

        // Create the statement analysis
        const statementAnalysis = await this.statementAnalysisModel.create({
            user: document.user,
            document: document._id,
            basicFeatures,
            transactionMetrics,
            categoryBreakdown,
            transactions,
            topCategories: analysisData.top_categories,
            userPersonaIndicators,
            financialBehavior,
            analyzedAt: new Date(),
        });

        return statementAnalysis._id.toString();
    }

    async getRecommendations(
        request: GetRecommendationRequestDto,
    ): Promise<any> {
        try {
            // Get user's statement analysis
            const userPersona = await this.statementAnalysisModel
                .findOne({customerId: request.customerId})
                .sort({analyzedAt: -1}).lean();

            // Get all available credit cards
            const availableCards = await this.creditCardAnalysisModel.find(
                {"isActive":true},
                {cardName:1,rewardSummary: 1, _id: 0},
            ).lean();

            const currentEarningCard = await this.creditCardAnalysisModel.find(
                {"cardName":{"$in":request.cardName}},
                {cardName:1,rewardSummary: 1, _id: 0},
            ).limit(50).lean();

            const prompt = this.geminiService.getRecommendationPrompt(
                JSON.stringify(userPersona),
                JSON.stringify(availableCards),
            );

            const cuurentEarningPompt = this.geminiService.getRecommendationCurrentPrompt(
                JSON.stringify(userPersona),
                JSON.stringify(currentEarningCard),
            );
            let answer = [];
            let currentEarning=[];
            if(currentEarningCard && currentEarningCard.length>0){
                [answer,currentEarning] = await Promise.all([
                    this.geminiService.makeOpenAICall(prompt),
                    this.geminiService.makeOpenAICall(cuurentEarningPompt),
                ])
            }
            else{
                answer = await this.geminiService.makeOpenAICall(prompt);
            }

            const result = []
            let currentEarningAmount = 0;
            let count = 0;
            if(currentEarning && currentEarning['totalReturn']){
                currentEarningAmount =currentEarning['totalReturn']
                count = currentEarningCard.length
            }

            if(count>0){
                currentEarningAmount = Number(Number(currentEarningAmount/count).toFixed(2));
            }
            if(answer && answer['topRecommendations']){
                for(const item of answer['topRecommendations']){
                    let cardName = item['cardName'];
                    const availableCards = await this.creditCardAnalysisModel.findOne(
                        {cardName:cardName},
                    ).lean();
                    item['eligibilityCriteria'] = availableCards?.eligibilityCriteria;
                    item['rewardSummary'] = availableCards?.rewardSummary;
                    item['feeStructure'] = availableCards?.feeStructure;
                    item['benefits'] = availableCards?.benefits;
                    item['currentReturn'] = currentEarningAmount;
                    result.push(item);

                }
            }

            // Parse and validate the response
            return result;
        } catch (error) {
            this.logger.error(`Error getting recommendations: ${error.message}`);
            throw new Error(`Failed to get recommendations: ${error.message}`);
        }
    }

    private createRecommendationPrompt(context: any): string {
        return `
      Based on the following user profile and available credit cards, provide personalized credit card recommendations.
      
      User Profile:
      - Spending Pattern: ${context.userAnalysis.spendingPattern}
      - Top Categories: ${context.userAnalysis.topCategories.join(', ')}
      - User Persona: ${Object.entries(
            context.userAnalysis.userPersonaIndicators,
        )
            .filter(([_, value]) => value)
            .map(([key]) => key)
            .join(', ')}
      ${context.preferences ? `- Preferences: ${context.preferences}` : ''}

      Available Cards:
      ${JSON.stringify(context.availableCards, null, 2)}

      Please provide recommendations in the following JSON format:
      {
        "recommendations": [
          {
            "cardName": "string",
            "bankName": "string",
            "matchScore": number,
            "reasons": ["string"],
            "benefits": ["string"],
            "eligibilityCriteria": {
              "age": "string",
              "income_trv": "string",
              "others": "string"
            },
            "feeStructure": {
              "joiningFee": "string",
              "annualFee": "string",
              "renewalFee": "string",
              "renewalFeeWaiver": "string",
              "forexMarkup": "string",
              "fuelSurchargeWaiver": "string",
              "others": "string"
            }
          }
        ]
      }
    `;
    }

    private parseRecommendations(response: string): any[] {
        try {
            const parsedResponse = JSON.parse(response);
            if (
                !parsedResponse.recommendations ||
                !Array.isArray(parsedResponse.recommendations)
            ) {
                throw new Error('Invalid response format');
            }
            return parsedResponse.recommendations;
        } catch (error) {
            this.logger.error(`Error parsing recommendations: ${error.message}`);
            throw new Error(`Failed to parse recommendations: ${error.message}`);
        }
    }
}
