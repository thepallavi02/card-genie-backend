import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeStatementRequestDto {
  @IsNotEmpty()
  @IsString({ each: true })
  filePaths: string[];
}

export class AnalyzeStatementResponseDto {
  basicFeatures: {
    creditLimit: number;
    availableCredit: number;
    cashLimit: number;
    availableCash: number;
    creditUtilizationRatio: number;
    totalAmountDue: number;
    minimumAmountDue: number;
    rewardPoints: number;
    bankName: string;
    cardType: string;
    statementDate: string;
    paymentDueDate: string;
  };

  transactionMetrics: {
    transactionCount: number;
    totalSpend: number;
    averageTransactionAmount: number;
    largestTransaction: number;
    smallestTransaction: number;
  };

  categoryBreakdown: {
    [key: string]: {
      amount: number;
      percentage: number;
      count: number;
    };
  };

  transactions: Array<{
    date: string;
    merchant: string;
    amount: number;
    category: string;
  }>;

  topCategories: string[];

  userPersonaIndicators: {
    highSpender: boolean;
    rewardOptimizer: boolean;
    digitalNative: boolean;
    foodEnthusiast: boolean;
    travelLover: boolean;
    shopper: boolean;
    entertainmentSeeker: boolean;
    healthConscious: boolean;
    familyOriented: boolean;
    techSavvy: boolean;
  };

  financialBehavior: {
    utilizationLevel: string;
    paymentBehavior: string;
    spendingPattern: string;
  };
}
