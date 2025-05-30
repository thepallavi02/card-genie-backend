import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CreditCardAnalysisDocument = CreditCardAnalysis & Document;

@Schema()
export class CreditCardAnalysis {
  @Prop({ required: true })
  cardName: string;

  @Prop({})
  bankName: string;

  @Prop({ type: Object })
  eligibilityCriteria: {
    age: string;
    income_trv: string;
    others: string;
  };

  @Prop({ type: [Object] })
  rewardSummary: Array<{
    rewardCategory: string;
    rewardStructures: Array<{
      valueForCalculation: string;
      notes: string;
    }>;
  }>;

  @Prop({ type: [Object] })
  benefits: Array<{
    title: string;
  }>;

  @Prop({ default: Date.now })
  analyzedAt: Date;

  @Prop({type:Object})
  feeStructure:{
    joiningFee: string;
    annualFee: string;
    renewalFee: string;
    renewalFeeWaiver: string;
    forexMarkup: string;
    fuelSurchargeWaiver: string;
    others: string;
  }

  @Prop()
  isActive: boolean;
}

export const CreditCardAnalysisSchema =
  SchemaFactory.createForClass(CreditCardAnalysis);
