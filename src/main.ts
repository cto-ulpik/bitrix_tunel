import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

import { urlencoded, json } from 'express';
import * as fs from 'fs';
import * as https from 'https';
import { join } from 'path';
import * as express from 'express';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { initSwagger } from './app.swagger';

async function bootstrap() {
  const server = express();

  const logger = new Logger();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  //tamaño de json
  app.use(json({ limit: '150mb' }));
  app.use(urlencoded({ extended: true, limit: '150mb' }));
  //Cors
  app.enableCors();
  //Prefijo Global de la api (excepto para AppController raíz)
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'status'],
  });
  // Configuración de CORS
  app.enableCors({
    origin: ['*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true,
  });
  // Aplicar filtro de excepciones global
 

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const nodeEnv = 3333;

  initSwagger(app);

  await app.listen(nodeEnv);

  logger.log(`Running in ${nodeEnv} mode`);
  /*   logger.log(`App https running in ${serverHttps.address()['port']}/api`); */
  logger.log(`App running in ${await app.getUrl()}/api`);
  logger.log(`Swagger running in ${await app.getUrl()}/docs`);
  logger.log(`Version 1.0.0`);
}
bootstrap();
