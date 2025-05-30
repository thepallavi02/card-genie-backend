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
        
        NOTE: For the category breakdown don't show for the ones for which the value is 0.
        NOTE: Pay very special care for the card type and bank name.
        NOTE: For the category_breakdown part, make sure it is monthly. But if the data in the credit card statement is not a monthly data, take its average so that we get the monthly data, but make sure averge monthly data are for these specific categories:- SHOPPING, GROCERY, FOOD & Dining, Movie & Entertainment,Fuel,UPI,Utility Bills and for the rest of the category take the sum of them
        NOTE: In case there are multiple statements provided and they are of same month, then take the sum of them and if they are of different month, then take the average of them.
        NOTE: For the category breakdown, if any transaction of which you're not sure about the category, then consider it as "Others".
        NOTE: For the category breakdown section, in the brands field, give the list of brands that are present in the transaction under the category and it should be comma separated.

        1. BASIC FEATURES: Extract credit limit.

        2. TRANSACTION ANALYSIS: Analyze all debit transactions (ignore credits, payments, refunds) and categorize them.

        3. COMPREHENSIVE CATEGORIZATION RULES:
            CAB:
            - Where you kind keywords similar to: uber, ola, meru, rapido, bluesmart, cab, taxi, auto

            HOTEL:
            - Where you kind keywords similar to: oyo, treebo, fabhotels, lemon tree, taj hotels, itc hotels, trident, hotel
            - Hotel Chains: hyatt, westin, rosette, ramada, taj, itc, marriott, radisson, sheraton, novotel, lemontree, holiday inn, park plaza, hilton, fairfield, jw marriott, vivanta, the leela, the oberoi, four seasons, pullman, doubletree, renaissance, aloft, st regis, ibis, crowne plaza, intercontinental, best western, comfort inn, days inn, la quinta, embassy suites, hampton inn, courtyard, residence inn, springhill suites, homewood suites, extended stay, candlewood suites

            FLIGHT:
            - Where you kind keywords similar to: makemytrip, mmt, goibibo, cleartrip, easemytrip, ixigo, tripfactory, yatra, expedia, booking.com, agoda, trivago
            - Where you kind keywords similar to: air india, airindia, indigo, vistara, akasa air, spicejet, goair, go first, jet airways, alliance air, trujet, air asia, emirates, qatar airways, lufthansa, british airways, singapore airlines, thai airways, cathay pacific, etihad, air france, klm, swiss, turkish airlines
            
            
            BUS/RAILWAY:
            - Where you kind keywords similar to: irctc, redbus, abhibus, rail yatri, intrcity, apsrtc, ktc, ksrtc, msrtc, gsrtc, upsrtc, rsrtc, himachal roadways, punjab roadways, volvo, scania, mercedes

            SHOPPING:
            - Where you kind keywords similar to: Amazon(amazon, amzn, amazon pay), Flipkart(flipkart, fkrt, ekart), Meesho(meesho, fashnear), Nykaa(nykaa, fsn e-commerce ventures, fsnecommerceventures), Myntra, Ajio, Tata CLiQ (tatacliq, tata cliq), snapdeal, paytm mall, shopclues, limeroad, koovs, jabong, voonik
            - Where you kind keywords similar to: Mamaearth (mamaearth, honasa consumer), Mcaffeine (mcaffeine, pep technologies), WOW Skin Science (wow, fit&glow), Beardo (beardo, zodica lifestyle), Plum (plum, pureplay skin sciences), Bombay Shaving Co (bombay shaving, bombay shaving company), purplle, zivame, clovia, prettysecrets, biba, w for woman, global desi, aurelia, rangmanch
            - Where you kind keywords similar to: FirstCry (firstcry, brainbees solutions), hopscotch, babyoye, momspresso
            - Where you kind keywords similar to: Reliance Digital (reliance digital, reliance retail, digital store), Croma (croma, infiniti retail), vijay sales, Boat (boat, imagine marketing), oneplus, xiaomi, samsung, apple, lg, sony, dell, hp, lenovo, asus, acer, canon, nikon
            - Where you kind keywords similar to: Pantaloons (pantaloons, abfrl, aditya birla fashion), Max/Lifestyle (max fashion, lifestyle, landmark group), shoppers stop, central, westside, brand factory, reliance trends, v-mart, big bazaar
            - Where you kind keywords similar to: urban ladder, urbanladder.com, Pepperfry (pepperfry, trendsutra), fabfurnish, hometown, nilkamal, godrej interio, durian, evok, damro
            - Where you kind keywords similar to: RedTape (redtape, mirza international), Campus (campus, campus activewear), Bata (bata, bata india), liberty, action, relaxo, paragon, khadims, metro
            
            GOLF:
            - Where you kind keywords similar to: golf, golf club, golf course, green fee, tee time, driving range, caddie, golf range, golf booking
            - Where you kind keywords similar to: Delhi Golf Club, DLF Golf, KGA (Karnataka Golf Association), BPGC (Bombay Presidency Golf Club), Eagleton Golf, Qutab Golf Course, Jaypee Greens Golf, Willow Woods Golf, Prestige Golfshire, Oxford Golf Resort
            - Where you kind keywords similar to: TeeTime, GolfLan, GolfNow, BookMyGolf, Golftripz, PlayMoreGolf, India Golf Services, GolfNext

            DINING:
            - Where you kind keywords similar to: eazydiner, zomato dine, swiggy dineout, dineout, magicpin
            - Where you kind keywords similar to: jubilant foodworks, barbeque nation, bikanervala, haldiram, dominos, pizza hut, kfc, mcdonalds, burger king, cafe coffee day, ccd, starbucks, costa coffee, barista, wow momo, behrouz biryani, faasos, freshmenu, mojo pizza, pizza express, papa johns, subway, taco bell, dunkin donuts, baskin robbins, naturals ice cream
            - Where you kind keywords similar to: cafe, bistro, lounge, brewery, grill, bar, restro, social, kitchen, taproom, pub, canteen, restaurant, dhaba, eatery, food court

            FOOD:
            - Where you kind keywords similar to: swiggy, zomato, uber eats, foodpanda, box8, rebel foods, eat.fit
            - Where you kind keywords similar to: food, balaji food, food freaks, meal, tiffin, catering

            GROCERY:
            - Where you kind keywords similar to: swiggy instamart, instamart, blinkit, zepto, bigbasket, bbnow, bb now, country delight, countrydelight, grofers, amazon fresh, flipkart grocery, jiomart, dunzo
            - Where you kind keywords similar to: more, reliance fresh, dmart, spencer's, heritage fresh, easyday, nilgiris, foodworld, hypercity, star bazaar, walmart, metro cash & carry

            MOVIE:
            - Where you kind keywords similar to: pvr, inox, cinepolis, carnival cinemas, miraj cinemas, delite cinemas, wave cinemas, fun cinemas, mukta cinemas, fame cinemas
            - Where you kind keywords similar to: bookmyshow, paytm movies, fandango
            - Where you kind keywords similar to: movie, cinema, film, multiplex

            FUEL:
            - Where you kind keywords similar to: petrol, diesel, fuel, hpcl, iocl, bpcl, bharat petroleum, indian oil, hindustan petroleum, reliance petroleum, essar oil, shell, total, bp
            - Where you kind keywords similar to: gas station, petrol pump, fuel station, cng, lpg

            HEALTH:
            - Where you kind keywords similar to: netmeds, 1mg, pharmeasy, medlife, apollo pharmacy online, healthkart, wellness forever
            - Where you kind keywords similar to: apollo pharmacy, guardian pharmacy, medplus, wellness pharmacy, fortis healthcare, max healthcare, manipal hospitals, narayana health
            - Where you kind keywords similar to: pharmacy, chemist, hospital, clinic, medical, health, wellness, doctor, diagnostic, pathology, lab, medicine, drug store

            BILLS:
            - Where you kind keywords similar to: reliance jio, reliance infocomm, airtel, bharti airtel, bsnl, vi, vodafone idea, mtnl, tata teleservices, idea cellular
            - Where you kind keywords similar to: electricity, power, gas bill, water bill, broadband, internet, cable tv, dth, dish tv, tata sky, sun direct, videocon d2h, den networks
            - Where you kind keywords similar to: bbps, paytm bills, phonepe bills, gpay bills, mobikwik bills, freecharge
            - Where you kind keywords similar to: postpaid, prepaid, mobile, phone, recharge, telephony, utility, bill payment, municipal corporation

            FOREX:
            - Where you kind keywords similar to: markup, forex, cross currency, currency conversion, int'l tx, intl txn, fc conv, foreign currency, international fee
            - Where you kind keywords similar to: If any transaction present in the credit card statement has FYC markup, forex, markup present, then consider it as forex.
            
            BANK_SPECIFIC_PORTAL:
            - Where you kind keywords similar to: smartbuy, hdfc smartbuy
            - Where you kind keywords similar to: ishop, icici shop, icicibank.com/shop, icici store
            - Where you kind keywords similar to: grabdeals, axis grabdeals, axis rewards
            - Where you kind keywords similar to: sbicard rewards, sbi rewards, sbicard shop, sbi delight
            - Where you kind keywords similar to: kotak rewards, kotak deals, kotakfavourites
            - Where you kind keywords similar to: rbl rewards, rbl shop, rbl delight
            - Where you kind keywords similar to: yesrewardz, yes cart, yes bank deals
            - Where you kind keywords similar to: sc smartbuy, scb rewards
            - Where you kind keywords similar to: hsbc rewards, hsbc shop
            - Where you kind keywords similar to: indusind delights, indus shop


            OTHERS:
            - Everything that doesn't match any category above

        RETURN ONLY THIS JSON FORMAT:

        {{
        "basic_features": {{
            "credit_limit": 0, // In case there are multiple statements, take its sum
        }},
        "transaction_metrics": {{
            "transaction_count": 0,
            "total_spend": 0,
            "average_transaction_amount": 0,
            "largest_transaction": 0,
            "smallest_transaction": 0
        }},
        "category_breakdown": {{
            "SHOPPING" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "GROCERY" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "FOOD" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "DINING" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "MOVIE" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "FUEL" : {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}}, 
            "UPI": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "CAB": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "BUS/RAILWAY": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "HOTEL": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "FLIGHT": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "GOLF": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "FOREX": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "BILLS": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "BANK_SPECIFIC_PORTAL": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "HEALTH": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}},
            "Others": {{"amount": 0, "percentage": 0.0, "count": 0, "brands": ""}}, 
        }},
        "top_categories": [], // Make sure it is ranged from top to bottom. And give only top 3 categories.
        
        }}

        NOTE: For the category breakdown don't show for the ones for which the value is 0.
        NOTE: Pay very special care for the card type and bank name.
        NOTE: For the category_breakdown part, make sure it is monthly. But if the data in the credit card statement is not a monthly data, take its average so that we get the montly data, but make sure averge monthly data are for these specific categories:- SHOPPING, GROCERY, FOOD & Dining, Movie & Entertainment,Fuel,UPI,Utility Bills and for the rest of the category take the sum of them
        NOTE: In case there are multiple statements provided and they are of same month, then take the sum of them and if they are of different month, then take the average of them.
        NOTE: For the category breakdown, if any transaction of which you're not sure about the category, then consider it as "Others".
        NOTE: For the category breakdown section, in the brands field, give the list of brands that are present in the transaction under the category and it should be comma separated.

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
