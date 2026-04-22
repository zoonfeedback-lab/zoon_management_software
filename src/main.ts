import { ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isVercel = process.env.VERCEL === '1';
  const vercelUrl = process.env.VERCEL_URL;

  if (isVercel) {
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const docsConfig = new DocumentBuilder()
    .setTitle('Zoon Management Software API')
    .setDescription('API documentation for the Zoon Management Software backend.')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(isVercel ? '/api' : '/');

  if (vercelUrl) {
    docsConfig.addServer(`https://${vercelUrl}/api`);
  }

  const document = SwaggerModule.createDocument(app, docsConfig.build());
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
