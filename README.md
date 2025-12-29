<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Sistema de integración Bitrix Tunnel - API para gestionar webhooks de Hotmart, Jelou y Bitrix24, con gestión de cursos en SQLite.

## 🚀 Módulos Principales

- **Hotmart**: Procesamiento de webhooks de compras y suscripciones
- **Jelou**: Integración con WhatsApp para atención al cliente
- **Bitrix**: Integración con Bitrix24 CRM
- **Cursos**: API REST para gestión de cursos en SQLite

## 📚 API de Cursos

API REST para gestionar cursos con operaciones GET, POST y PUT.

### Endpoints

- `GET /api/cursos` - Obtener todos los cursos
- `GET /api/cursos/:id` - Obtener un curso por ID
- `POST /api/cursos` - Crear un nuevo curso
- `PUT /api/cursos/:id` - Actualizar un curso existente

### Ejemplo de uso

```bash
# Obtener todos los cursos
curl http://localhost:3333/api/cursos

# Obtener un curso específico
curl http://localhost:3333/api/cursos/5634737

# Crear un nuevo curso
curl -X POST http://localhost:3333/api/cursos \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1234567,
    "curso": "Nuevo Curso",
    "mes": "Enero",
    "desc": "Descripción del curso"
  }'

# Actualizar un curso
curl -X PUT http://localhost:3333/api/cursos/5634737 \
  -H "Content-Type: application/json" \
  -d '{
    "curso": "Curso Actualizado",
    "mes": "Febrero",
    "desc": "Nueva descripción"
  }'
```

Para más detalles, consulta [CURSOS_API.md](./CURSOS_API.md)

## 🗄️ Base de Datos

- **Tipo**: SQLite
- **Archivo**: `database.sqlite`
- **Tabla**: `cursos` (se crea automáticamente al iniciar la aplicación)
- **Datos iniciales**: Se cargan automáticamente 13 cursos predefinidos al arrancar

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

### Scripts de Despliegue

- `./deploy.sh` - Despliegue completo (pull, install, build, restart)
- `./restart-prod.sh` - Reinicio rápido en producción
- `./fix-prod.sh` - Resolver problemas y reiniciar

### Despliegue Manual

```bash
# Conectarse al servidor
ssh root@159.223.204.96

# Actualizar código
cd /var/www/bitrix_tunel
git pull origin master
npm install
npm run build
pm2 restart bitrix-tunnel
```

Para más detalles, consulta [DEPLOYMENT.md](./DEPLOYMENT.md)

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
