import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);