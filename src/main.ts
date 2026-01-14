import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  dotenv.config();
  const baseUrlPrefix = process.env.BASE_URL_PREFIX || '';
  app.setGlobalPrefix(`${baseUrlPrefix}/api`);

  const config = new DocumentBuilder()
    .setTitle('Socket Auth and User Module')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${baseUrlPrefix}/docs`, app, document, {
    swaggerOptions: {
      apisSorter: 'alpha',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    jsonDocumentUrl: `${baseUrlPrefix}/docs-json`, // exposes /docs-json
    customSiteTitle: 'API Docs',
  });

  const port = Number(process.env.PORT) || 3005;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/docs-json`);
}
void bootstrap();
