import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';

export type QuestionnaireDocument = Questionnaire & Document;

@Schema()
export class SpendCategoryItem {
  @Prop({ required: true })
  categoryName: string;

  @Prop()
  categoryAmount: number;

  @Prop()
  categoryScore: string;

  @Prop({ type: [String] })
  subCategory: string[];
}

const SpendCategoryItemSchema = SchemaFactory.createForClass(SpendCategoryItem);

@Schema()
export class Questionnaire {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: [SpendCategoryItemSchema], required: true })
  spendCategory: SpendCategoryItem[];

  // @Prop()
  // incomeRange: string;

  @Prop()
  hasCreditCard: boolean;

  @Prop()
  creditLimit: string;

  @Prop({ required: true, default: Date.now })
  submittedAt: Date;
}

export const QuestionnaireSchema = SchemaFactory.createForClass(Questionnaire);
