# Card Genie Backend

A NestJS-based backend service for credit card management and processing. This application provides a robust API for handling credit card-related operations with integration to various AI services.

## Features

- Credit card data management
- Integration with multiple AI services (OpenAI, Google AI, Groq)
- PDF processing capabilities
- MongoDB database integration
- RESTful API endpoints
- File upload handling

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB
- **AI Services**: 
  - OpenAI
  - Google Generative AI
  - Groq
- **File Processing**: PDF parsing and processing
- **Additional Tools**: 
  - Multer for file uploads
  - Class Validator for input validation
  - Axios for HTTP requests

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd card-genie-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Add your environment variables here
# Example:
# MONGODB_URI=your_mongodb_connection_string
# OPENAI_API_KEY=your_openai_api_key
# GOOGLE_AI_KEY=your_google_ai_key
# GROQ_API_KEY=your_groq_api_key
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── database/           # Database related modules and schemas
├── types/             # TypeScript type definitions
├── credit-card/       # Credit card related functionality
├── app.module.ts      # Main application module
├── main.ts           # Application entry point
└── app.controller.ts # Main application controller
```

## API Documentation

The API documentation will be available at `/api` when running the application in development mode.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the UNLICENSED License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team. 