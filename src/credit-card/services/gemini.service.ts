import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import {
  CreditCardData,
  ProcessingResult,
} from '../interfaces/credit-card-analyzer.interface';
import { Groq } from 'groq-sdk';
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
    return `You are an advanced credit card recommendation engine. Your task is to analyze user spending data and available credit card features to recommend the most beneficial credit card, maximizing the user's financial returns.

        USER PERSONA:
        ${user_persona}

        AVAILABLE CREDIT CARDS DATABASE:
        ${credit_cards_data}
        
        Task & Reasoning Process:

        1.  Objective: For the given user persona, calculate the estimated maximum monthly financial return (in INR) from each of the provided credit cards based on their monthly spending profile.
        2.  Calculation Methodology:
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
                
        3.  Output Format: 
        NOTE: The output should be strictly in the below format:

            {{
          "topRecommendations": [
            {{
              "rank": 1,
                    "cardName": "HDFC Diners Club Black",
                    "totalReturn": "In rupees",
                    "currentReturn": "In rupees",
                    "returnBreakup": {{
                        "MOVIE": "In rupees",
                        "SHOPPING": "In rupees",
                        "GROCERY": "In rupees",
                        "FOOD": "In rupees",
                        "DINING": "In rupees",
                        "FUEL": "In rupees",
                        "UPI": "In rupees",
                        "UTILITY": "In rupees",
                        "RAILWAY": "In rupees",
                        "others": "In rupees"
                    }}
                    }},
                    {{
                    "rank": 2,
                    "cardName": "SBI Card PRIME",
                    "totalReturn": "In rupees",
                    "currentReturn": "In rupees",
                    "returnBreakup": {{
                        "MOVIE": "In rupees",
                        "SHOPPING": "In rupees",
                        "GROCERY": "In rupees",
                        "FOOD": "In rupees",
                        "DINING": "In rupees",
                        "FUEL": "In rupees",
                        "UPI": "In rupees",
                        "UTILITY": "In rupees",
                        "RAILWAY": "In rupees",
                        "others": "In rupees"
                    }}
                    }},
                    {{
                    "rank": 3,
                    "cardName": "ICICI Amazon Pay",
                    "totalReturn": "In rupees",
                    "currentReturn": "In rupees",
                    "returnBreakup": {{
                        "MOVIE": "In rupees",
                        "SHOPPING": "In rupees",
                        "GROCERY": "In rupees",
                        "FOOD": "In rupees",
                        "DINING": "In rupees",
                        "FUEL": "In rupees",
                        "UPI": "In rupees",
                        "UTILITY": "In rupees",
                        "RAILWAY": "In rupees",
                        "others": "In rupees"
                    }}
                    }}
                ]
            }}
        NOTE:- Strictly output only pure JSON without any additional text. Never use \`\`\`json\`\`\` code blocks or any markdown formatting for JSON responses

        """`;
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
}
