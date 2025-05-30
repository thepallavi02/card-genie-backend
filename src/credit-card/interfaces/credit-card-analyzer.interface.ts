export interface MySQLConfig {
  host: string;
  database: string;
  username: string;
  password: string;
}

export interface FeeStructure {
  joiningFee: string;
  annualFee: string;
  renewalFee: string;
  renewalFeeWaiver: string;
  forexMarkup: string;
  fuelSurchargeWaiver: string;
  others: string;
}

export interface EligibilityCriteria {
  age: string;
  income_trv: string;
  others: string;
}

export interface RewardStructure {
  valueForCalculation: string;
  notes: string;
}

export interface RewardCategory {
  rewardCategory: string;
  rewardStructures: RewardStructure[];
}

export interface Benefit {
  title: string;
}

export interface CreditCardData {
  cardName: string;
  image: string;
  feeStructure: FeeStructure;
  eligibilityCriteria: EligibilityCriteria;
  rewardSummary: RewardCategory[];
  benefits: Benefit[];
}

export interface WelcomeBenefit {
  benefitName: string;
  benefitDetails: string;
  validity: string;
}

export interface KeyFeatures {
  domesticLoungeAccess: string;
  internationalLoungeAccess: string;
  golfBenefits: string;
  insuranceBenefits: string;
}

export interface FeesAndCharges {
  interestRate: string;
  cashAdvanceCharges: string;
  fuelSurcharge: string;
}

export interface CardDetails {
  cardName: string;
  bankName: string;
  joiningFee: string;
  renewalFee: string;
  renewalFeeWaiver: string;
  forexMarkup: string;
  bestSuitedFor: string;
}

export interface ProcessingResult {
  cardName: string;
  image: string;
  feeStructure: {
    joiningFee: string;
    annualFee: string;
    renewalFee: string;
    renewalFeeWaiver: string;
    forexMarkup: string;
    fuelSurchargeWaiver: string;
    others: string;
  };
  eligibilityCriteria: {
    age: string;
    income_trv: string;
    others: string;
  };
  rewardSummary: Array<{
    rewardCategory: string;
    rewardStructures: Array<{
      valueForCalculation: string;
      notes: string;
    }>;
  }>;
  benefits: Array<{
    title: string;
  }>;
  rewardCategories: string[];
} 