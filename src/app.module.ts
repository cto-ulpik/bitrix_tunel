import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JelouModule } from './jelou/jelou.module';
import { BitrixModule } from './bitrix/bitrix.module';
import { HotmartModule } from './hotmart/hotmart.module';

@Module({
  imports: [JelouModule, BitrixModule, HotmartModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
