import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { StatementAnalysis, StatementAnalysisDocument } from '../schemas/statement-analysis.schema';
import { DocumentUpload, DocumentUploadDocument } from '../schemas/document.schema';
import { AnalyzeStatementResponseDto } from '../dto/analyze-statement.dto';

@Injectable()
export class StatementAnalyzerService {
  private readonly logger = new Logger(StatementAnalyzerService.name);

  constructor(
    @InjectModel(StatementAnalysis.name) private statementAnalysisModel: Model<StatementAnalysisDocument>,
    @InjectModel(DocumentUpload.name) private documentModel: Model<DocumentUploadDocument>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Analyzes a credit card statement PDF file
   * @param documentId The ID of the document to analyze
   * @returns The analysis results
   */
  async analyzeStatement(documentId: string): Promise<AnalyzeStatementResponseDto> {
    try {
      // Get the document from the database
      const document = await this.documentModel.findById(documentId);
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }

      // Extract text from all PDF files and combine them
      let combinedPdfText = '';

      if (!document.filePaths || document.filePaths.length === 0) {
        throw new Error('No PDF files found for this document');
      }

      for (const filePath of document.filePaths) {
        try {
          const pdfText = await this.extractTextFromPdf(filePath);
          combinedPdfText += pdfText + '\n\n--- NEW DOCUMENT ---\n\n';
        } catch (error) {
          this.logger.error(`Error extracting text from PDF ${filePath}: ${error.message}`);
        }
      }

      if (!combinedPdfText) {
        throw new Error('Failed to extract text from any of the uploaded PDFs');
      }

      // Analyze the combined text
      const pdfText = combinedPdfText;

      // Analyze the text using Groq API
      const analysisResult = await this.analyzeWithGroq(pdfText);

      // Save the analysis results to the database
      const statementAnalysis = await this.statementAnalysisModel.create({
        document: document._id,
        basicFeatures: analysisResult.basicFeatures,
        transactionMetrics: analysisResult.transactionMetrics,
        categoryBreakdown: analysisResult.categoryBreakdown,
        transactions: analysisResult.transactions,
        topCategories: analysisResult.topCategories,
        userPersonaIndicators: analysisResult.userPersonaIndicators,
        financialBehavior: analysisResult.financialBehavior,
      });

      return analysisResult;
    } catch (error) {
      this.logger.error(`Error analyzing statement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extracts text from a PDF file
   * @param filePath The path to the PDF file
   * @returns The extracted text
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      this.logger.log(`Extracting text from PDF: ${filePath}`);

      // In a real implementation, we would use a PDF parsing library like pdf-parse
      // For now, we'll simulate the extraction by returning a placeholder text
      // This would be replaced with actual PDF parsing code in a production environment

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }

      // Simulate text extraction
      return `--- Page 1 ---
Statement Date: 2023-05-15
Payment Due Date: 2023-06-05
Credit Card Statement
Card Number: XXXX XXXX XXXX 1234
Card Type: HDFC Bank Regalia
Credit Limit: 500000
Available Credit: 350000
Cash Limit: 100000
Available Cash: 100000
Total Amount Due: 150000
Minimum Amount Due: 7500
Reward Points: 5000

--- Page 2 ---
Transaction Details:
Date        Description                 Amount
2023-04-16  AMAZON.IN                   5000
2023-04-18  FLIPKART                    3500
2023-04-20  UBER                        750
2023-04-22  SWIGGY                      1200
2023-04-25  MAKEMYTRIP                  25000
2023-04-28  APOLLO PHARMACY             1500
2023-05-01  RELIANCE DIGITAL            35000
2023-05-05  AIRTEL POSTPAID             999
2023-05-08  NETFLIX                     649
2023-05-10  AMAZON PRIME                1499
2023-05-12  ZOMATO                      850
2023-05-14  UBER                        650`;
    } catch (error) {
      this.logger.error(`Error extracting text from PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyzes the extracted text using the Groq API
   * @param pdfText The extracted text from the PDF
   * @returns The analysis results
   */
  private async analyzeWithGroq(pdfText: string): Promise<AnalyzeStatementResponseDto> {
    try {
      this.logger.log(`Analyzing text with Groq API`);

      // In a real implementation, we would use the Groq API client to send the text for analysis
      // For now, we'll simulate the analysis by returning a placeholder response
      // This would be replaced with actual API calls in a production environment

      // Generate the prompt for the Groq API
      const prompt = this.getExtractionPrompt(pdfText);

      // Simulate API response
      return {
        basicFeatures: {
          creditLimit: 500000,
          availableCredit: 350000,
          cashLimit: 100000,
          availableCash: 100000,
          creditUtilizationRatio: 30,
          totalAmountDue: 150000,
          minimumAmountDue: 7500,
          rewardPoints: 5000,
          bankName: "HDFC Bank",
          cardType: "Regalia",
          statementDate: "2023-05-15",
          paymentDueDate: "2023-06-05"
        },
        transactionMetrics: {
          transactionCount: 12,
          totalSpend: 76597,
          averageTransactionAmount: 6383,
          largestTransaction: 35000,
          smallestTransaction: 649
        },
        categoryBreakdown: {
          "SHOPPING": {
            amount: 43500,
            percentage: 56.79,
            count: 3
          },
          "CAB": {
            amount: 1400,
            percentage: 1.83,
            count: 2
          },
          "FOOD": {
            amount: 2050,
            percentage: 2.68,
            count: 2
          },
          "TRAVEL": {
            amount: 25000,
            percentage: 32.64,
            count: 1
          },
          "HEALTH": {
            amount: 1500,
            percentage: 1.96,
            count: 1
          },
          "BILLS": {
            amount: 999,
            percentage: 1.30,
            count: 1
          },
          "ENTERTAINMENT": {
            amount: 2148,
            percentage: 2.80,
            count: 2
          }
        },
        transactions: [
          {
            date: "2023-04-16",
            merchant: "AMAZON.IN",
            amount: 5000,
            category: "SHOPPING"
          },
          {
            date: "2023-04-18",
            merchant: "FLIPKART",
            amount: 3500,
            category: "SHOPPING"
          },
          {
            date: "2023-04-20",
            merchant: "UBER",
            amount: 750,
            category: "CAB"
          },
          {
            date: "2023-04-22",
            merchant: "SWIGGY",
            amount: 1200,
            category: "FOOD"
          },
          {
            date: "2023-04-25",
            merchant: "MAKEMYTRIP",
            amount: 25000,
            category: "TRAVEL"
          },
          {
            date: "2023-04-28",
            merchant: "APOLLO PHARMACY",
            amount: 1500,
            category: "HEALTH"
          },
          {
            date: "2023-05-01",
            merchant: "RELIANCE DIGITAL",
            amount: 35000,
            category: "SHOPPING"
          },
          {
            date: "2023-05-05",
            merchant: "AIRTEL POSTPAID",
            amount: 999,
            category: "BILLS"
          },
          {
            date: "2023-05-08",
            merchant: "NETFLIX",
            amount: 649,
            category: "ENTERTAINMENT"
          },
          {
            date: "2023-05-10",
            merchant: "AMAZON PRIME",
            amount: 1499,
            category: "ENTERTAINMENT"
          },
          {
            date: "2023-05-12",
            merchant: "ZOMATO",
            amount: 850,
            category: "FOOD"
          },
          {
            date: "2023-05-14",
            merchant: "UBER",
            amount: 650,
            category: "CAB"
          }
        ],
        topCategories: ["SHOPPING", "TRAVEL", "ENTERTAINMENT", "FOOD", "CAB"],
        userPersonaIndicators: {
          highSpender: true,
          rewardOptimizer: true,
          digitalNative: true,
          foodEnthusiast: false,
          travelLover: true,
          shopper: true,
          entertainmentSeeker: false,
          healthConscious: false,
          familyOriented: false,
          techSavvy: true
        },
        financialBehavior: {
          utilizationLevel: "MEDIUM",
          paymentBehavior: "FULL",
          spendingPattern: "REGULAR"
        }
      };
    } catch (error) {
      this.logger.error(`Error analyzing with Groq API: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generates the extraction prompt for the Groq API
   * @param pdfText The extracted text from the PDF
   * @returns The extraction prompt
   */
  private getExtractionPrompt(pdfText: string): string {
    return `You are a credit card statement analysis expert. Extract comprehensive features from the following credit card statement and return data in the exact JSON format specified below.

    EXTRACTION INSTRUCTIONS:

    1. BASIC FEATURES: Extract credit limit, available credit, cash limit, outstanding amounts, reward points, bank name, card type, and dates from the statement header/summary section.

    2. TRANSACTION ANALYSIS: Analyze all debit transactions (ignore credits, payments, refunds) and categorize them.

    3. COMPREHENSIVE CATEGORIZATION RULES:
        CAB:
        - Keywords: uber, ola, meru, rapido, bluesmart, cab, taxi, auto

        HOTEL:
        - Keywords: oyo, treebo, fabhotels, lemon tree, taj hotels, itc hotels, trident, hotel
        - Hotel Chains: hyatt, westin, rosette, ramada, taj, itc, marriott, radisson, sheraton, novotel, lemontree, holiday inn, park plaza, hilton, fairfield, jw marriott, vivanta, the leela, the oberoi, four seasons, pullman, doubletree, renaissance, aloft, st regis, ibis, crowne plaza, intercontinental, best western, comfort inn, days inn, la quinta, embassy suites, hampton inn, courtyard, residence inn, springhill suites, homewood suites, extended stay, candlewood suites

        TRAVEL:
        - Aggregators: makemytrip, mmt, goibibo, cleartrip, easemytrip, ixigo, tripfactory, yatra, expedia, booking.com, agoda, trivago
        - Airlines: air india, airindia, indigo, vistara, akasa air, spicejet, goair, go first, jet airways, alliance air, trujet, air asia, emirates, qatar airways, lufthansa, british airways, singapore airlines, thai airways, cathay pacific, etihad, air france, klm, swiss, turkish airlines
        - Bus/Train: irctc, redbus, abhibus, rail yatri, intrcity, apsrtc, ktc, ksrtc, msrtc, gsrtc, upsrtc, rsrtc, himachal roadways, punjab roadways, volvo, scania, mercedes

        SHOPPING:
        - E-commerce: amazon, amzn, amazon pay, flipkart, fkrt, ekart, meesho, fashnear, nykaa, fsn e-commerce ventures, fsnecommerceventures, myntra, ajio, tatacliq, tata cliq, snapdeal, paytm mall, shopclues, limeroad, koovs, jabong, voonik
        - Fashion & Beauty: mamaearth, honasa consumer, mcaffeine, pep technologies, wow, fit&glow, beardo, zodica lifestyle, plum, pureplay skin sciences, bombay shaving, bombay shaving company, purplle, zivame, clovia, prettysecrets, biba, w for woman, global desi, aurelia, rangmanch
        - Kids: firstcry, brainbees solutions, hopscotch, babyoye, momspresso
        - Electronics: reliance digital, reliance retail, digital store, croma, infiniti retail, vijay sales, boat, imagine marketing, oneplus, xiaomi, samsung, apple, lg, sony, dell, hp, lenovo, asus, acer, canon, nikon
        - Fashion Retail: pantaloons, abfrl, aditya birla fashion, max fashion, lifestyle, landmark group, shoppers stop, central, westside, brand factory, reliance trends, v-mart, big bazaar
        - Home & Furniture: urban ladder, urbanladder.com, pepperfry, trendsutra, fabfurnish, hometown, nilkamal, godrej interio, durian, evok, damro
        - Footwear: redtape, mirza international, campus, campus activewear, bata, bata india, liberty, action, relaxo, paragon, khadims, metro

        DINING:
        - Platforms: eazydiner, zomato dine, swiggy dineout, dineout, magicpin
        - Chains: jubilant foodworks, barbeque nation, bikanervala, haldiram, dominos, pizza hut, kfc, mcdonalds, burger king, cafe coffee day, ccd, starbucks, costa coffee, barista, wow momo, behrouz biryani, faasos, freshmenu, mojo pizza, pizza express, papa johns, subway, taco bell, dunkin donuts, baskin robbins, naturals ice cream
        - Pattern Matching: cafe, bistro, lounge, brewery, grill, bar, restro, social, kitchen, taproom, pub, canteen, restaurant, dhaba, eatery, food court

        FOOD:
        - Delivery: swiggy, zomato, uber eats, foodpanda, box8, rebel foods, eat.fit
        - Keywords: food, balaji food, food freaks, meal, tiffin, catering
        - (Only if NOT already classified as Dining or Grocery)

        GROCERY:
        - Online: swiggy instamart, instamart, blinkit, zepto, bigbasket, bbnow, bb now, country delight, countrydelight, grofers, amazon fresh, flipkart grocery, jiomart, dunzo
        - Retail: more, reliance fresh, dmart, spencer's, heritage fresh, easyday, nilgiris, foodworld, hypercity, star bazaar, walmart, metro cash & carry

        MOVIE:
        - Theaters: pvr, inox, cinepolis, carnival cinemas, miraj cinemas, delite cinemas, wave cinemas, fun cinemas, mukta cinemas, fame cinemas
        - Platforms: bookmyshow, paytm movies, fandango
        - Keywords: movie, cinema, film, multiplex

        FUEL:
        - Companies: petrol, diesel, fuel, hpcl, iocl, bpcl, bharat petroleum, indian oil, hindustan petroleum, reliance petroleum, essar oil, shell, total, bp
        - Keywords: gas station, petrol pump, fuel station, cng, lpg

        HEALTH:
        - Online: netmeds, 1mg, pharmeasy, medlife, apollo pharmacy online, healthkart, wellness forever
        - Retail: apollo pharmacy, guardian pharmacy, medplus, wellness pharmacy, fortis healthcare, max healthcare, manipal hospitals, narayana health
        - Keywords: pharmacy, chemist, hospital, clinic, medical, health, wellness, doctor, diagnostic, pathology, lab, medicine, drug store

        BILLS:
        - Telecom: reliance jio, reliance infocomm, airtel, bharti airtel, bsnl, vi, vodafone idea, mtnl, tata teleservices, idea cellular
        - Utilities: electricity, power, gas bill, water bill, broadband, internet, cable tv, dth, dish tv, tata sky, sun direct, videocon d2h, den networks
        - Platforms: bbps, paytm bills, phonepe bills, gpay bills, mobikwik bills, freecharge
        - Keywords: postpaid, prepaid, mobile, phone, recharge, telephony, utility, bill payment, municipal corporation

        OTHERS:
        - Everything that doesn't match any category above

    4. CALCULATIONS:
    - credit_utilization_ratio = ((credit_limit - available_credit) / credit_limit) * 100
    - ratio = amount / total_spend
    - percentage = ratio * 100
    - For each category: sum amounts, count transactions

    5. USER PERSONA LOGIC:
    - high_spender: total_spend > 50000 OR credit_utilization_ratio > 70
    - reward_optimizer: reward_points > 1000
    - digital_native: online transactions > 80% of total
    - food_enthusiast: (FOOD + DINING) > 30% of total spend
    - travel_lover: (TRAVEL + CAB + HOTEL) > 20% of total spend
    - shopper: SHOPPING > 40% of total spend
    - entertainment_seeker: (MOVIE + DINING) > 25% of total spend
    - health_conscious: HEALTH > 10% of total spend
    - family_oriented: (GROCERY + HEALTH + BILLS) > 40% of total spend
    - tech_savvy: digital payment platforms > 50% of transactions

    6. FINANCIAL BEHAVIOR:
    - utilization_level: LOW (<30%), MEDIUM (30-70%), HIGH (>70%)
    - payment_behavior: Estimate based on outstanding vs minimum due
    - spending_pattern: REGULAR (if consistent amounts), IRREGULAR otherwise

    CREDIT CARD STATEMENT TEXT:
    ${pdfText}`;
  }
}
