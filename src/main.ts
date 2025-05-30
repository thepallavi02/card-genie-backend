import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Set global prefix to match the API URL in requirements
  const apiPrefix = configService.get<string>('API_PREFIX');
  app.setGlobalPrefix(apiPrefix);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  const port = configService.get<number>('PORT');
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
