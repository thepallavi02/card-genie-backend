import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import {
  CreditCardData,
  ProcessingResult,
} from '../interfaces/credit-card-analyzer.interface';
import { Groq } from 'groq-sdk';
import axios from 'axios';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private gr: GenerativeModel;
  private readonly groqApiKey = process.env.GROQ_API_KEY;
  private readonly groqModel = 'deepseek-r1-distill-llama-70b';

  constructor() {
    const apiKey =
      process.env.GOOGLE_API_KEY || 'AIzaSyA1q7sX8tagRms8KfAwro33doUbBCXr05g';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });


  }

  async uploadPdfFile(pdfPath: string): Promise<any> {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      this.logger.log(`Uploading PDF file to Gemini: ${pdfPath}`);

      // Note: The Node.js/TypeScript SDK doesn't support file uploads directly
      // This would need to be implemented via REST API or using a different approach
      // For now, we'll simulate this or use base64 encoding directly in generateContent

      // Read file and convert to base64 for inline data
      const fileBuffer = fs.readFileSync(pdfPath);
      const base64Data = fileBuffer.toString('base64');

      return {
        mimeType: 'application/pdf',
        data: base64Data,
        name: path.basename(pdfPath),
      };
    } catch (error) {
      this.logger.error(`Failed to process PDF file: ${error.message}`);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  getExtractionPrompt(): string {
    return `
        CRITICAL INSTRUCTION: Extract information very accurately from the credit card document. Focus on data that is actually present in the document - do not infer or add information that is not provided in the pdfs.

        You are an expert financial data analyst specializing in credit cards. Your task is to extract comprehensive details about specific credit cards from their pdfs For each provided pdf, meticulously analyze the pdf and extract the following information.

        Prioritize extracting quantifiable values for rewards. If an exact number isn't available but a type of benefit is, follow the specified format given below. If information for a category is not explicitly found, state "Not Found" or "Not Applicable."

        For each pdf, extract information under these categories and sub-categories:

        Card Name: [Full Name of the Credit Card]
        
        Fee Structure:
            Joining Fee: [Amount in INR, e.g., "Rs 12,499 + Taxes" or "Nil" or "Waived on certain conditions"]
            Annual Fee: [Amount in INR, e.g., "Rs 12,499 + Taxes" or "Nil" or "Waived on spends of Rs X lakh"]
            Add-On Cards Fee: [Fee, e.g., "Complimentary," "Rs 500 per card," or "Not specified"]
            Forex Markup: [Percentage, e.g., "2%," "0%," or "Not specified"]
            Fuel Surcharge Waiver: [Percentage and capping details, e.g., "1% up to Rs 1,000/month on transactions between Rs 400-Rs 4,000"]
            Other Significant Fees: [List any other prominent fees like cash advance fee, reward redemption fee if applicable]
            
        Benefits (Key Feature):
            [List key reward benefits concisely, e.g., "Welcome Bonus (non-RP part like memberships). Give top 5 benefits]
            
        Eligibility:
            Age: [Min/Max age range, e.g., "21-60 years"]
            Income/TRV (Total Relationship Value): [Monthly/Annual income requirement or TRV, e.g., "Salaried: GMI > Rs 1.2 Lakh/month," "Self-Employed: ITR > Rs 14.4 Lakhs p.a.," "TRV > Rs 5 Crore"]
            Other Criteria: [Any other specific criteria, e.g., "Invite Only," "Existing bank customer relationship required"]
            
        Reward (Quantified Values - Use numerical values or specific formats):
            MOVIE:
                Below is how you calculate the value 
                    - If BOGO: "BOGO, [Number] times per month, up to Rs [Amount] off per ticket."
                    - If Percentage off: "[Percentage]% off, up to Rs [Amount] per month."
                    - If fixed discount: "Rs [Amount] off per ticket, [Number] times per month."
            SHOPPING:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."
            GROCERY:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."    
            FOOD:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."
            DINING:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."
            FUEL:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No points on fuel."
                    - Surcharge Waiver: "1% Surcharge waiver, capped at Rs [Amount] per month."
            UPI:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No points on UPI."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."
            UTILITY:
                Note: It should only consist of Electricity/Internet/Telephone Bills/Infocomm/Water Bills/Cooking Gas Bills/Cable TV Bills/Govt. Bills.
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No points on utility bills."
                    - Cashback/Discount: "[Percentage]% cashback/discount, up to Rs [Amount] per month."    
            RAILWAY (Train):
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No specific benefits."
                    - Other Benefits: "[Description of specific railway benefits, e.g., lounge access at stations, if applicable]"
            FLIGHT(Travel):
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No specific benefits."
                    - Other Benefits: "[Description of specific flight benefits, e.g., lounge access at stations, if applicable]"  
            HOTEL(Travel):
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent" OR "No specific benefits."
                    - Other Benefits: "[Description of specific benefits]"        
            Reward Point (Base Rate & Value):
                Below is how you calculate the value
                    - Base Rate: "[X] Reward Points for every Rs [Y] spent (on general retail/non-excluded categories)."
                    - Highest Redemption Value: "[1 RP = Rs Z]" (Specify type, e.g., "Flights/Hotels/Specific Brand Vouchers")
                    - Other Redemption Value: "[1 RP = Rs Z]" (Specify type, e.g., "General Catalogue Products/Vouchers")
                    - Cashback Redemption Value: "[1 RP = Rs Z]" (If convertible to statement credit/cashback)
            Domestic Lounge:
                Below is how you calculate the value
                    - Access: "[Number] access per [Quarter/Year]" OR "Unlimited access."
                    - Guest Access: "Plus [Number] guest visits per [Quarter/Year]" (if applicable).
                    - Estimated Value per Visit (for calculation): Rs 1,000 (Use this for calculation if card doesn't state value.)
            International Lounge:
                Below is how you calculate the value
                    - Access: "[Number] access per [Quarter/Year]" OR "Unlimited access."
                    - Guest Access: "Plus [Number] guest visits per [Quarter/Year]" (if applicable).
                    - Estimated Value per Visit (for calculation): Rs 2,500 (Use this for calculation if card doesn't state value.)
            HOTEL:
                Below is how you calculate the value
                    - Reward Point Earnings: "[X] Reward Points per Rs [Y] spent."
                    - Discount/Free Nights: "[Percentage]% off" or "[Number] free nights/discounts through specific platform/partner."
            GOLF:
                Below is how you calculate the value
                    - Access: "[Number] complimentary rounds/lessons per [Month/Year]" OR "Unlimited access."
                    - Estimated Value per Round (for calculation): Rs 5,000 (Use this for calculation if card doesn't state value.)
            FOREX Markup (as a reward/benefit if 0%): "[Percentage]% (If 0% waiver, state 0%. Otherwise, state the standard markup for comparison.)"
            CASHBACK (Direct):
                Below is how you calculate the value
                    - "[Percentage]% direct cashback, up to Rs [Amount] per [Month/Statement Cycle]."
            Smartbuy/Grab Deals/iShop/Bank-Specific Portal Usage (for accelerated rewards):
                Below is how you calculate the value
                    - Travel (Flights/Trains): "Up to [X]X Reward Points" or "[Percentage]% discount" on [Specific Platform, e.g., Smartbuy, iShop].
                    - Hotel Booking: "Up to [X]X Reward Points" or "[Percentage]% discount" on [Specific Platform, e.g., Smartbuy, iShop].
                    - Shopping: "Up to [X]X Reward Points" or "[Percentage]% discount" on [Specific Platform, e.g., Smartbuy, iShop], or "Vouchers at [1 RP = Rs Z] via platform."
            Other Quantifiable Rewards: [Add any other distinct reward categories found on the page, with quantifiable values.]

            
Output format
Generate a JSON object with the following structure that captures both basic card information and detailed reward structures:

            {
            "cardName":"string",
            "image":"string",
            "feeStructure":{
               "joiningFee": "string",
               "annualFee": "string",
               "renewalFee": "string",
               "renewalFeeWaiver": "string",
               "forexMarkup": "string",
               "fuelSurchargeWaiver":"string",
               "others":"string"
            }
            "eligibilityCriteria": {
                "age":"string"
                "income_trv": "string",
                "others": "string"
            },
            "rewardSummary": [
                {
                "rewardCategory": "string",
                "rewardStructures": [
                    {
                    "valueForCalculation": "string",
                    "notes": "string"
                    }
                ]
                }
            ],
            "benefits": [{
                "title":"string"
            }],
            }

            **IMPORTANT EXTRACTION RULES:**
             1. Be meticulous: Read the page carefully for all details, including footnotes and linked benefit documents.
             2. Prioritize quantification: Always provide numerical values for rewards where possible. If a range is given, state the range or the maximum.
             3. Adhere strictly to the output categories and sub-categories. If a category is not explicitly mentioned on the page for that card, state  "Not Applicable" or "No specific benefit mentioned."
             4. Do not hallucinate data. If information is truly not present, state that it's "Not found" or "Not specified."

            Please analyze this credit card document and extract the information according to the above structure and guidelines. Return only the JSON response.
        `;
  }

  async analyzeWithGemini(
    fileData: any,
    prompt: string,
  ): Promise<ProcessingResult> {
    try {
      this.logger.log('Sending request to Gemini model');

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data,
          },
        },
      ]);
      const response = await result.response;
      const responseText = response.text();

      this.logger.log(`Received response of ${responseText.length} characters`);
      this.logger.log(`Response text: ${responseText}`);

      // Extract JSON from response
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = responseText.substring(jsonStart, jsonEnd);
      const parsedResult = JSON.parse(jsonStr);

      this.logger.log('Successfully parsed JSON response');
      return parsedResult;
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error(`JSON parsing error: ${error.message}`);
        throw new Error(`Failed to parse JSON response: ${error.message}`);
      }

      this.logger.error(`Gemini API error: ${error.message}`);
      throw new Error(`Gemini API call failed: ${error.message}`);
    }
  }

  validateAndCleanResponse(data: ProcessingResult): ProcessingResult {
    try {
      // Validate required sections
      const requiredSections = [
        'cardName',
        'feeStructure',
        'eligibilityCriteria',
        'rewardSummary',
        'benefits',
      ];
      for (const section of requiredSections) {
        if (!(section in data)) {
          this.logger.warn(`Missing required section: ${section}`);
        }
      }

      // Generate summary information if reward summary exists
      if (data.rewardSummary) {
        const rewardCategories = data.rewardSummary
          .map((item) => item.rewardCategory || 'Unknown')
          .slice(0, 5); // Top 5 categories

        // Add rewardCategories to data if needed for processing
        (data as any).rewardCategories = rewardCategories;
      }

      return data;
    } catch (error) {
      this.logger.error(`Data validation error: ${error.message}`);
      return data; // Return original data if validation fails
    }
  }

  getRecommendationPrompt(user_persona, credit_cards_data): string {
    return `

# You are an advanced credit card recommendation engine. Your task is to analyze user spending data and available credit card features to recommend the most beneficial credit card, maximizing the user's financial returns.


The USER PERSONA IS: 
${user_persona}  

## USER PERSONA FORMAT:
The user persona will contain:
category_breakdown: Actual spending amounts per category
transaction_metrics: Overall spending statistics
basic_features: User's credit profile

AVAILABLE CREDIT CARDS DATABASE:
${credit_cards_data}


## CALCULATION METHODOLOGY:

## CALCULATION METHODOLOGY WITH EXAMPLES:

### MOVIE Category:
**Card Benefit Examples & Calculations:**
**BOGO**: "BOGO, 4 times per month, up to Rs 200 off per ticket"
  - Calculation: If user spends Rs 1,200 on movies (assuming Rs 300/ticket), they get 4 tickets free
  - Return: Min(Number of tickets bought, 4) × Rs 200 = Up to Rs 800
**Percentage off**: "20% off, up to Rs 500 per month"
  - Calculation: Min(Monthly Movie Spend × 0.20, Rs 500)
  - Example: Rs 1,200 × 0.20 = Rs 240 (since < Rs 500 cap)
**Fixed discount**: "Rs 150 off per ticket, 2 times per month"
  - Calculation: Min(Number of movie transactions, 2) × Rs 150

### SHOPPING Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "2 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Shopping Spend ÷ 100) × 2 × Redemption Value
  - Example: Rs 23,182.71 ÷ 100 × 2 × Rs 1 = Rs 463.65
**Cashback**: "5% cashback, up to Rs 1,000 per month"
  - Calculation: Min(Monthly Shopping Spend × 0.05, Rs 1,000)
  - Example: Min(Rs 23,182.71 × 0.05, Rs 1,000) = Rs 1,000 (capped)

### GROCERY Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "3 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Grocery Spend ÷ 100) × 3 × Redemption Value
  - Example: Rs 2,999 ÷ 100 × 3 × Rs 1 = Rs 89.97
**Cashback**: "2% cashback, up to Rs 300 per month"
  - Calculation: Min(Monthly Grocery Spend × 0.02, Rs 300)
  - Example: Min(Rs 2,999 × 0.02, Rs 300) = Rs 59.98

### FOOD Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "4 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Food Spend ÷ 100) × 4 × Redemption Value
  - Example: Rs 3,928.21 ÷ 100 × 4 × Rs 1 = Rs 157.13
**Cashback**: "10% cashback, up to Rs 400 per month"
  - Calculation: Min(Monthly Food Spend × 0.10, Rs 400)
  - Example: Min(Rs 3,928.21 × 0.10, Rs 400) = Rs 392.82

### DINING Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "5 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Dining Spend ÷ 100) × 5 × Redemption Value
  - Example: Rs 256 ÷ 100 × 5 × Rs 1 = Rs 12.80
**Cashback**: "15% cashback, up to Rs 500 per month"
  - Calculation: Min(Monthly Dining Spend × 0.15, Rs 500)
  - Example: Min(Rs 256 × 0.15, Rs 500) = Rs 38.40

### FUEL Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "2 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Fuel Spend ÷ 100) × 2 × Redemption Value
**Surcharge Waiver**: "1% Surcharge waiver, capped at Rs 200 per month"
  - Calculation: Min(Monthly Fuel Spend × 0.01, Rs 200)
**No Points**: "No points on fuel" = Rs 0

### UPI Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "1 Reward Point per Rs 100 spent"
  - Calculation: (Monthly UPI Spend ÷ 100) × 1 × Redemption Value
  - Example: Rs 297 ÷ 100 × 1 × Rs 1 = Rs 2.97
**Cashback**: "1% cashback, up to Rs 100 per month"
  - Calculation: Min(Monthly UPI Spend × 0.01, Rs 100)
**No Points**: "No points on UPI" = Rs 0

### UTILITY Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "1 Reward Point per Rs 100 spent"
  - Calculation: (Monthly Utility Spend ÷ 100) × 1 × Redemption Value
**No Points**: "No points on utility bills" = Rs 0

### RAILWAY (Train) Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "2 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Railway Spend ÷ 100) × 2 × Redemption Value
**No Benefits**: "No specific benefits" = Rs 0

### FLIGHT (Travel) Category:
**Card Benefit Examples & Calculations:**
**Reward Points**: "3 Reward Points per Rs 100 spent"
  - Calculation: (Monthly Flight Spend ÷ 100) × 3 × Redemption Value
**No Benefits**: "No specific benefits" = Rs 0

### Base Reward Points:
**Card Benefit Examples & Calculations:**
**Base Rate**: "1 Reward Point for every Rs 100 spent"
  - Applied to: Categories without specific benefits + Others category
  - Calculation: (Spend in non-specific categories ÷ 100) × 1 × Redemption Value
**Redemption Values**: Use highest redemption value available for calculations

### Domestic Lounge:
**Card Benefit Examples & Calculations:**
**Access**: "4 access per quarter" = 16 visits per year ÷ 12 = Rs 1,333.33 per month
**Calculation**: (Annual visits ÷ 12) × Rs 1,000 per visit
**Unlimited access**: Estimate 2 visits per month = Rs 2,000 per month

### International Lounge:
**Card Benefit Examples & Calculations:**
**Access**: "2 access per year" = Rs 416.67 per month
**Calculation**: (Annual visits ÷ 12) × Rs 2,500 per visit
**Guest Access**: "Plus 1 guest visit per year" = Additional Rs 208.33 per month

### GOLF:
**Card Benefit Examples & Calculations:**
**Access**: "1 complimentary round per month" = Rs 5,000 per month
**Access**: "4 rounds per year" = Rs 1,666.67 per month
**Calculation**: (Annual rounds ÷ 12) × Rs 5,000 per round

### Direct Cashback:
**Card Benefit Examples & Calculations:**
**Direct Cashback**: "1.5% direct cashback, up to Rs 2,000 per month"
  - Calculation: Min(Total Monthly Spend × 0.015, Rs 2,000)

## CALCULATION PROCESS:

### Step 1: For Each Credit Card in Database
Extract all reward structures from rewardSummary array

### Step 2: For Each Spending Category
Get user's monthly spending amount from persona
Apply card's specific benefit for that category
Calculate return using formulas above
Apply caps and restrictions

### Step 3: Calculate Total Return
Sum all category returns + annual benefits (divided by 12)

### Step 4: Rank Cards
Sort by total monthly return (highest to lowest) and select TOP 3 cards only

## OUTPUT FORMAT:
json
{
  "topRecommendations": [
    {
      "rank": 1,
      "cardName": "[Exact card name from database]",
      "totalReturn": "[Total return in Rs]",
      "returnBreakup": {
        "MOVIE": "[Return amount or 0 if no spending/benefit]",
        "SHOPPING": "[Calculated return based on spending and card benefits]",
        "GROCERY": "[Calculated return based on spending and card benefits]",
        "FOOD": "[Calculated return based on spending and card benefits]",
        "DINING": "[Calculated return based on spending and card benefits]",
        "FUEL": "[Return amount or 0 if no spending/benefit]",
        "UPI": "[Calculated return - often 0 due to restrictions]",
        "UTILITY": "[Return amount or 0 if no spending/benefit]",
        "RAILWAY": "[Return amount or 0 if no spending/benefit]",
        "others": "[Return from base rate on Others category + any other benefits like lounge access value]"
      },
      "calculationNotes": "[Explain key assumptions, caps applied, etc.]"
    }
  ]
}

## IMPORTANT NOTES:
1. Use EXACT spending amounts from user persona
2. Apply all caps and restrictions mentioned in card benefits
3. The return benefit should strictly be calculated for all the categories present in the user persona.
4. For categories with no user spending, return should be 0
5. For "Others" category, apply base reward rate or percentage discount only
6. Include annual benefits (like lounge access, etc) divided by 12 for monthly equivalent
7. Clearly state any assumptions made in calculations

## CRITICAL INSTRUCTION: Analyze the provided user persona against EACH credit card in the database. Calculate exact monthly returns using the user's specific spending amounts and each card's reward structure. Rank cards by total return value and provide TOP 3 RECOMMENDATIONS ONLY with all monetary values prefixed with Rs. Example - Rs. 500. Note that there is a space between Rs and the amount.
## CRITICAL INSTRUCTION: Strictly output only pure JSON without any additional text. Never use \`\`\`json\`\`\` code blocks or any markdown formatting for JSON responses

`;


  }

  getRecommendationCurrentPrompt(user_persona, credit_cards_data): string {
    return `You are an advanced credit card return calculator. Your task is to analyze a user's actual spending data and their current credit card's features to calculate the actual returns they are earning from their existing card.

TASK OVERVIEW:
Input: User persona (monthly spending data) + User's Current Credit Card(s) details
Process: Calculate actual monthly returns the user earned from their current card
Output: totalReturn based on the instruction provided below

The USER PERSONA IS: 
${user_persona}  

CURRENT CREDIT CARDS DETAILS:
${credit_cards_data}

USER PERSONA STRUCTURE:
The user persona contains actual monthly spending data across categories:

category_breakdown: Actual monthly spending amounts per category
transaction_metrics: Overall monthly spending statistics
basic_features: User's credit profile

CURRENT CARD ANALYSIS:
You will analyze the user's existing credit card (provided in the credit card database) to calculate what they actually earned based on their real spending pattern.

CALCULATION METHODOLOGY WITH EXAMPLES:
MOVIE Category:
Current Card Benefit & Actual Return Calculation:

BOGO: "BOGO, 4 times per month, up to Rs 200 off per ticket"
User's Actual Movie Spend: Rs [amount from user persona]
Actual Return Calculation: Based on actual number of movie transactions
Example: If user spent Rs 800 on 2 movies, got 2 free tickets = Rs 400 return

Percentage off: "20% off, up to Rs 500 per month"
Actual Return: Min(User's Actual Movie Spend × 0.20, Rs 500)

No Benefits: Rs 0

SHOPPING Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "2 Reward Points per Rs 100 spent"
User's Actual Shopping Spend: Rs [amount from category_breakdown.SHOPPING.amount]
Actual Return: (Actual Shopping Spend ÷ 100) × 2 × Redemption Value
Example: Rs 23,182.71 ÷ 100 × 2 × Rs 1 = Rs 463.65

Cashback: "5% cashback, up to Rs 1,000 per month"
Actual Return: Min(Actual Shopping Spend × 0.05, Rs 1,000)


GROCERY Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "3 Reward Points per Rs 100 spent"
User's Actual Grocery Spend: Rs [amount from category_breakdown.GROCERY.amount]
Actual Return: (Actual Grocery Spend ÷ 100) × 3 × Redemption Value
Example: Rs 2,999 ÷ 100 × 3 × Rs 1 = Rs 89.97

No Benefits: Rs 0

FOOD Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "4 Reward Points per Rs 100 spent"
User's Actual Food Spend: Rs [amount from category_breakdown.FOOD.amount]
Actual Return: (Actual Food Spend ÷ 100) × 4 × Redemption Value
Example: Rs 3,928.21 ÷ 100 × 4 × Rs 1 = Rs 157.13


DINING Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "5 Reward Points per Rs 100 spent"
User's Actual Dining Spend: Rs [amount from category_breakdown.DINING.amount]
Actual Return: (Actual Dining Spend ÷ 100) × 5 × Redemption Value
Example: Rs 256 ÷ 100 × 5 × Rs 1 = Rs 12.80


FUEL Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "2 Reward Points per Rs 100 spent"
Actual Return: (Actual Fuel Spend ÷ 100) × 2 × Redemption Value

Surcharge Waiver: "1% Surcharge waiver, capped at Rs 200 per month"
Actual Return: Min(Actual Fuel Spend × 0.01, Rs 200)

No Points: Rs 0

UPI Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "1 Reward Point per Rs 100 spent"
User's Actual UPI Spend: Rs [amount from category_breakdown.UPI.amount]
Actual Return: (Actual UPI Spend ÷ 100) × 1 × Redemption Value
Example: Rs 297 ÷ 100 × 1 × Rs 1 = Rs 2.97

No Points: Rs 0

UTILITY Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "1 Reward Point per Rs 100 spent"
Actual Return: (Actual Utility Spend ÷ 100) × 1 × Redemption Value

No Points: Rs 0

RAILWAY Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "2 Reward Points per Rs 100 spent"
Actual Return: (Actual Railway Spend ÷ 100) × 2 × Redemption Value

No Benefits: Rs 0

FLIGHT Category:
Current Card Benefit & Actual Return Calculation:

Reward Points: "3 Reward Points per Rs 100 spent"
Actual Return: (Actual Flight Spend ÷ 100) × 3 × Redemption Value

No Benefits: Rs 0

Base Reward Points:
Current Card Benefit & Actual Return Calculation:

Base Rate: "1 Reward Point for every Rs 100 spent"
Applied to: Categories without specific benefits + Others category
Actual Return: (Actual Spend in applicable categories ÷ 100) × 1 × Redemption Value


Domestic Lounge:
Current Card Benefit & Actual Usage Calculation:

Access: "4 access per quarter"
Monthly Equivalent: 4 × 4 ÷ 12 = 1.33 visits per month
Actual Value: 1.33 × Rs 1,000 = Rs 1,333 per month (if user travels)

Note: Calculate based on estimated usage frequency

International Lounge:
Current Card Benefit & Actual Usage Calculation:

Access: "2 access per year"
Monthly Equivalent: 2 ÷ 12 = 0.17 visits per month
Actual Value: 0.17 × Rs 2,500 = Rs 417 per month (if user travels internationally)


GOLF:
Current Card Benefit & Actual Usage Calculation:

Access: "1 complimentary round per month"
Actual Value: Rs 5,000 per month (if user plays golf)


Direct Cashback:
Current Card Benefit & Actual Return Calculation:

Direct Cashback: "1.5% direct cashback, up to Rs 2,000 per month"
Actual Return: Min(User's Total Monthly Spend × 0.015, Rs 2,000)


CALCULATION PROCESS:
CALCULATION PROCESS:
Step 1: Identify User's Current Card(s)
Extract the specific credit card details from the database that matches the user's current card(s). If multiple cards are provided, analyze each card separately.

Step 2: For Each Card and Each Spending Category
Get user's actual monthly spending amount from persona
Apply each card's specific benefit for that category
Calculate actual return using formulas above
Apply caps and restrictions that limited actual returns

Step 3: Calculate Total Current Return
Single Card: Sum all category returns + annual benefits actually utilized (divided by 12)
Multiple Cards: Calculate total return for each card separately, then apply averaging logic:
If any card has total return = Rs 0, exclude it from average calculation
Take average of only cards with total return > Rs 0
If all cards have total return = Rs 0, show Rs 0



OUTPUT FORMAT:
{
  "totalReturn": "[Total monthly return user actually earned]",
}

## IMPORTANT NOTES:
1. Use EXACT spending amounts from user persona
2. Apply all caps and restrictions mentioned in card benefits
3. The return benefit should strictly be calculated for all the categories present in the user persona.
4. For categories with no user spending, return should be 0
5. For "Others" category, apply base reward rate or percentage discount only
6. Include annual benefits (like lounge access, etc) divided by 12 for monthly equivalent
7. Clearly state any assumptions made in calculations

## CRITICAL INSTRUCTION: Analyze the provided user persona against their CURRENT credit card(s). If multiple cards provided, calculate returns for each card separately. For final totalReturn, take average of only cards with returns > 0 (exclude any cards with 0 returns from average calculation). Output only the total return value.
## CRITICAL INSTRUCTION: Strictly output only pure JSON without any additional text. Never use \`\`\`json\`\`\` code blocks or any markdown formatting for JSON responses


`;


  }

  async recommendationWithGroq(prompt: string): Promise<any> {
    this.logger.log('Sending request to Groq API');

    if (!this.groqApiKey) {
      this.logger.error('GROQ_API_KEY is not set in environment variables');
      throw new Error('GROQ_API_KEY is not configured');
    }

    const apiUrl = 'https://api.groq.ai/v1/chat/completions';
    this.logger.log(`Attempting to connect to: ${apiUrl}`);

    try {
      // Initialize the Groq client
      const groq = new Groq({ apiKey: this.groqApiKey });
      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.groqModel,
        temperature: 0.1,
        top_p: 1,
        stop: null,
        stream: false
      });
      let cleanedJsonString = response. choices[0]?.message?.content?.trim();
      // 1) Remove all <think>…</think> blocks (and any stray <think> or </think> tags)
      const thinkBlockRegex = /<think>[\s\S]*?<\/think>/gi;
      cleanedJsonString = cleanedJsonString
          // first drop entire blocks
          .replace(thinkBlockRegex, '')
          // then just in case there are orphan tags
          .replace(/<\/?think>/gi, '')
          .trim();

      // Regex to match ```json ... ``` or ``` ... ``` blocks
      const tripleBacktickRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
      const match = cleanedJsonString.match(tripleBacktickRegex);
      // this.logger.debug(`Cleaned JSON String: ${cleanedJsonString}`);

      if (match && match[1]) {
        // If triple backticks found, use the content inside
        cleanedJsonString = match[1].trim();
        this.logger.debug('Removed triple backticks from LLM response.');
      } else if (
          cleanedJsonString.startsWith('`') &&
          cleanedJsonString.endsWith('`')
      ) {
        // If single backticks found, remove them
        cleanedJsonString = cleanedJsonString.substring(1, cleanedJsonString.length - 1).trim();
        this.logger.debug('Removed single backticks from LLM response.');
      }
      const parsedResponse = JSON.parse(cleanedJsonString);


      console.log(parsedResponse);
      // const jsonStart = cleanedJsonString.indexOf('{');
      // const jsonEnd = cleanedJsonString.lastIndexOf('}') + 1;
      // if (jsonStart === -1 || jsonEnd === 0) {
      //   throw new Error('No valid JSON found in response');
      // }
      // const jsonStr = cleanedJsonString.substring(jsonStart, jsonEnd);
      return parsedResponse;
    } catch (error) {
      return null;
    }
  }

  async makeOpenAICall(prompt: string): Promise<any> {
    try {
      this.logger.log('Making OpenAI API call');

      const response = await axios({
        method: 'post',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        data: {
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }
      });

      this.logger.log('Successfully received response from OpenAI');
      if(response.data.choices.length > 0) {
        return JSON.parse(response.data.choices[0].message.content)
      }
      return response.data;
    } catch (error) {
      this.logger.error(`OpenAI API call failed: ${error.message}`);
      throw new Error(`OpenAI API call failed: ${error.message}`);
    }
  }
}
