import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';

export type DocumentUploadDocument = DocumentUpload & Document;

@Schema()
export class DocumentUpload {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  cardBank: string;

  @Prop({ required: true })
  cardName: string;

  @Prop({ required: true, type: [String] })
  filePaths: string[];

  @Prop({ required: true, default: Date.now })
  uploadedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  bedrockResponse: any;
}

export const DocumentUploadSchema = SchemaFactory.createForClass(DocumentUpload);
