// analyze.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { Groq } from 'groq-sdk';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private readonly groqApiKey = process.env.GROQ_API_KEY;
  private readonly groqModel = 'deepseek-r1-distill-llama-70b';

  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    this.logger.log('Starting PDF text extraction');
    try {
      // Ensure we have a valid buffer
      if (!pdfBuffer) {
        this.logger.error('No PDF buffer provided');
        throw new Error('No PDF buffer provided');
      }

      if (!Buffer.isBuffer(pdfBuffer)) {
        this.logger.error('Invalid buffer type provided');
        throw new Error('Invalid buffer type provided');
      }

      this.logger.log(`PDF buffer size: ${pdfBuffer.length} bytes`);

      // Create a new buffer to ensure we have a clean copy
      const cleanBuffer = Buffer.from(pdfBuffer);
      this.logger.log('Created clean buffer copy');

      // Convert buffer to Uint8Array
      const uint8Array = new Uint8Array(cleanBuffer);
      this.logger.log('Converted buffer to Uint8Array');

      // Parse the PDF with options
      const data = await pdfParse(uint8Array, {
        max: 0, // No page limit
        version: 'v2.0.550',
      });
      this.logger.log('Successfully parsed PDF');

      if (!data || !data.text) {
        this.logger.error('No text content found in PDF');
        throw new Error('No text content found in PDF');
      }

      this.logger.log(`Extracted ${data.text.length} characters from PDF`);
      return data.text;
    } catch (error) {
      this.logger.error(`Error extracting text from PDF: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  getExtractionPrompt(pdfText: string): string {
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

        RETURN ONLY THIS JSON FORMAT:

        {{
        "basic_features": {{
            "credit_limit": 0,
            "available_credit": 0,
            "cash_limit": 0,
            "available_cash": 0,
            "credit_utilization_ratio": 0.0,
            "total_amount_due": 0,
            "minimum_amount_due": 0,
            "reward_points": 0,
            "bank_name": "",
            "card_type": "",
            "statement_date": "",
            "payment_due_date": ""
        }},
        "transaction_metrics": {{
            "transaction_count": 0,
            "total_spend": 0,
            "average_transaction_amount": 0,
            "largest_transaction": 0,
            "smallest_transaction": 0
        }},
        "category_breakdown": {{
            "CAB": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "HOTEL": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "TRAVEL": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "SHOPPING": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "DINING": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "FOOD": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "GROCERY": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "MOVIE": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "FUEL": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "HEALTH": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "BILLS": {{"amount": 0, "percentage": 0.0, "count": 0}},
            "OTHERS": {{"amount": 0, "percentage": 0.0, "count": 0}}
        }},
        "transactions": [
            {{
            "date": "YYYY-MM-DD",
            "merchant": "Merchant Name",
            "amount": 0,
            "category": "CATEGORY_NAME"
            }}
        ],
        "top_categories": [],
        "user_persona_indicators": {{
            "high_spender": false,
            "reward_optimizer": false,
            "digital_native": false,
            "food_enthusiast": false,
            "travel_lover": false,
            "shopper": false,
            "entertainment_seeker": false,
            "health_conscious": false,
            "family_oriented": false,
            "tech_savvy": false
        }},
        "financial_behavior": {{
            "utilization_level": "LOW/MEDIUM/HIGH",
            "payment_behavior": "FULL/MINIMUM/PARTIAL",
            "spending_pattern": "REGULAR/IRREGULAR/SEASONAL"
        }}
        }}

        NOTE: For the category breakdown don't show for the ones for which the value is 0.
        NOTE: Pay very special care for the card type and bank name.

        CREDIT CARD STATEMENT TEXT:
    ${pdfText}`;
  }

  async analyzeWithGroq(prompt: string): Promise<any> {
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
        max_tokens: 8192,
      });
      let cleanedJsonString = response.choices[0]?.message?.content?.trim();
      console.log(cleanedJsonString);
      const jsonStart = cleanedJsonString.indexOf('{');
      const jsonEnd = cleanedJsonString.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in response');
      }
      const jsonStr = cleanedJsonString.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        this.logger.error(
          'DNS resolution failed. Please check your internet connection and DNS settings.',
        );
        throw new Error(
          'DNS resolution failed. Please check your internet connection and DNS settings.',
        );
      }
      if (error.response) {
        this.logger.error(
          `Groq API error: ${error.response.status} - ${JSON.stringify(
            error.response.data,
          )}`,
        );
        throw new Error(
          `Groq API error: ${error.response.status} - ${error.response.data}`,
        );
      }
      this.logger.error(`Error calling Groq API: ${error.message}`);
      throw new Error(`Error calling Groq API: ${error.message}`);
    }
  }

  validateAndCleanResponse = (data: any) => {
    try {
      // Remove zero-value categories from breakdown
      if (data.category_breakdown) {
        const categoriesToRemove: string[] = [];

        for (const category in data.category_breakdown) {
          const details = data.category_breakdown[category];
          if (
            details &&
            typeof details === 'object' &&
            (details.amount ?? 0) === 0 &&
            (details.count ?? 0) === 0
          ) {
            categoriesToRemove.push(category);
          }
        }

        for (const category of categoriesToRemove) {
          delete data.category_breakdown[category];
        }

        console.info(
          `Removed ${categoriesToRemove.length} zero-value categories`,
        );
      }

      // Validate required fields
      const requiredSections = [
        'basic_features',
        'transaction_metrics',
        'category_breakdown',
      ];
      for (const section of requiredSections) {
        if (!(section in data)) {
          console.warn(`Missing required section: ${section}`);
        }
      }

      // Generate top categories
      if (data.category_breakdown) {
        const sortedCategories = Object.entries(data.category_breakdown).sort(
          (a: any, b: any) => (b[1].amount ?? 0) - (a[1].amount ?? 0),
        );
        data.top_categories = sortedCategories.slice(0, 5).map(([cat]) => cat);
      }

      return data;
    } catch (error: any) {
      console.error(`Data validation error: ${error.message}`);
      return data; // Return original data if validation fails
    }
  };


}
