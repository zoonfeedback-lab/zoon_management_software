import { ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Application, Request, Response } from 'express';
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
    .setDescription(
      'API documentation for the Zoon Management Software backend.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(isVercel ? '/api' : '/');

  if (vercelUrl) {
    docsConfig.addServer(`https://${vercelUrl}/api`);
  }

  const document = SwaggerModule.createDocument(app, docsConfig.build());
  const httpAdapter = app.getHttpAdapter();
  const server = httpAdapter.getInstance() as Application;
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: isVercel,
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  if (isVercel) {
    server.get('/docs', (_req: Request, res: Response) =>
      res.redirect('/api/docs'),
    );
    server.get('/docs-json', (_req: Request, res: Response) =>
      res.redirect('/api/docs-json'),
    );
    server.get('/api/docs/swagger-ui.css', (_req: Request, res: Response) =>
      res.redirect('https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'),
    );
    server.get(
      '/api/docs/swagger-ui-bundle.js',
      (_req: Request, res: Response) =>
        res.redirect(
          'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
        ),
    );
    server.get(
      '/api/docs/swagger-ui-standalone-preset.js',
      (_req: Request, res: Response) =>
        res.redirect(
          'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
        ),
    );
    server.get('/api/docs/favicon-32x32.png', (_req: Request, res: Response) =>
      res.redirect('https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png'),
    );
    server.get('/api/docs/favicon-16x16.png', (_req: Request, res: Response) =>
      res.redirect('https://unpkg.com/swagger-ui-dist@5/favicon-16x16.png'),
    );
  } else {
    // Local aliases so both /docs and /api/docs work.
    server.get('/api/docs', (_req: Request, res: Response) =>
      res.redirect('/docs'),
    );
    server.get('/api/docs-json', (_req: Request, res: Response) =>
      res.json(document),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
