# MongoDB Integration

This document describes how MongoDB is integrated into the Credit Card Recommendation API.

## Connection Setup

The MongoDB connection is configured directly in the `src/database/database.module.ts` file using NestJS's MongooseModule:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://pallavi_123:Pallavi123@cluster0.3vewt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    ),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
```

## Data Models

The application uses the following MongoDB models:

### User Model

Stores information about authenticated users:

```typescript
@Schema()
export class User {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}
```

### Document Upload Model

Stores information about uploaded credit card documents:

```typescript
@Schema()
export class DocumentUpload {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  cardBank: string;

  @Prop({ required: true })
  cardName: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true, default: Date.now })
  uploadedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  bedrockResponse: any;
}
```

### Questionnaire Model

Stores questionnaire responses:

```typescript
@Schema()
export class Questionnaire {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: [SpendCategoryItemSchema], required: true })
  spendCategory: SpendCategoryItem[];

  @Prop()
  incomeRange: string;

  @Prop()
  hasCreditCard: boolean;

  @Prop()
  creditLimit: string;

  @Prop({ required: true, default: Date.now })
  submittedAt: Date;
}
```

## Usage in Services

The models are injected into the `CreditCardService` using NestJS's dependency injection:

```typescript
@Injectable()
export class CreditCardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(DocumentUpload.name) private documentModel: Model<DocumentUploadDocument>,
    @InjectModel(Questionnaire.name) private questionnaireModel: Model<QuestionnaireDocument>
  ) {}

  // Service methods that use the models
}
```

## Future Enhancements

In a production environment, consider the following enhancements:

1. **Environment Variables**: Move the MongoDB connection string to environment variables for better security.
2. **Connection Pooling**: Configure connection pooling for better performance.
3. **Error Handling**: Add more robust error handling for database operations.
4. **Indexing**: Add indexes to frequently queried fields for better performance.
5. **Transactions**: Use transactions for operations that need to be atomic.
