import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JelouModule } from './jelou/jelou.module';
import { BitrixModule } from './bitrix/bitrix.module';
import { HotmartModule } from './hotmart/hotmart.module';
import { DatabaseModule } from './database/database.module';
import { CursosModule } from './cursos/cursos.module';

@Module({
  imports: [
    DatabaseModule,
    JelouModule,
    BitrixModule,
    HotmartModule,
    CursosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
