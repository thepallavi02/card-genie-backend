import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';
import { DocumentUpload } from './document.schema';

export type StatementAnalysisDocument = StatementAnalysis & Document;

@Schema()
export class BasicFeatures {
  @Prop({ required: true, default: 0 })
  creditLimit: number;

  @Prop({ required: true, default: 0 })
  availableCredit: number;

  @Prop({ required: true, default: 0 })
  cashLimit: number;

  @Prop({ required: true, default: 0 })
  availableCash: number;

  @Prop({ required: true, default: 0 })
  creditUtilizationRatio: number;

  @Prop({ required: true, default: 0 })
  totalAmountDue: number;

  @Prop({ required: true, default: 0 })
  minimumAmountDue: number;

  @Prop({ required: true, default: 0 })
  rewardPoints: number;

  @Prop({ required: true, default: '' })
  bankName: string;

  @Prop({ required: true, default: '' })
  cardType: string;

  @Prop({ required: true, default: '' })
  statementDate: string;

  @Prop({ required: true, default: '' })
  paymentDueDate: string;
}

@Schema()
export class TransactionMetrics {
  @Prop({ required: true, default: 0 })
  transactionCount: number;

  @Prop({ required: true, default: 0 })
  totalSpend: number;

  @Prop({ required: true, default: 0 })
  averageTransactionAmount: number;

  @Prop({ required: true, default: 0 })
  largestTransaction: number;

  @Prop({ required: true, default: 0 })
  smallestTransaction: number;
}

@Schema()
export class CategoryDetail {
  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ required: true, default: 0 })
  percentage: number;

  @Prop({ required: true, default: 0 })
  count: number;
}

@Schema()
export class Transaction {
  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  merchant: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  category: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

@Schema()
export class UserPersonaIndicators {
  @Prop({ required: true, default: false })
  highSpender: boolean;

  @Prop({ required: true, default: false })
  rewardOptimizer: boolean;

  @Prop({ required: true, default: false })
  digitalNative: boolean;

  @Prop({ required: true, default: false })
  foodEnthusiast: boolean;

  @Prop({ required: true, default: false })
  travelLover: boolean;

  @Prop({ required: true, default: false })
  shopper: boolean;

  @Prop({ required: true, default: false })
  entertainmentSeeker: boolean;

  @Prop({ required: true, default: false })
  healthConscious: boolean;

  @Prop({ required: true, default: false })
  familyOriented: boolean;

  @Prop({ required: true, default: false })
  techSavvy: boolean;
}

@Schema()
export class FinancialBehavior {
  @Prop({ required: true, default: 'LOW' })
  utilizationLevel: string;

  @Prop({ required: true, default: 'FULL' })
  paymentBehavior: string;

  @Prop({ required: true, default: 'REGULAR' })
  spendingPattern: string;
}

@Schema()
export class StatementAnalysis {

  @Prop({ type: String})
  customerId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentUpload', required: true })
  document: DocumentUpload;

  @Prop({ type: BasicFeatures, required: true })
  basicFeatures: BasicFeatures;

  @Prop({ type: TransactionMetrics, required: true })
  transactionMetrics: TransactionMetrics;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  categoryBreakdown: Record<string, CategoryDetail>;

  @Prop({ type: [TransactionSchema], required: true })
  transactions: Transaction[];

  @Prop({ type: [String], required: true })
  topCategories: string[];

  @Prop({ type: UserPersonaIndicators, required: true })
  userPersonaIndicators: UserPersonaIndicators;

  @Prop({ type: FinancialBehavior, required: true })
  financialBehavior: FinancialBehavior;

  @Prop({ required: true, default: Date.now })
  analyzedAt: Date;
}

export const StatementAnalysisSchema = SchemaFactory.createForClass(StatementAnalysis);
