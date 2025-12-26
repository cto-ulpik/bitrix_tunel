import { Module } from '@nestjs/common';
import { HotmartController } from './hotmart.controller';
import { HotmartService } from './hotmart.service';
import { BitrixModule } from '../bitrix/bitrix.module';

@Module({
  imports: [BitrixModule],
  controllers: [HotmartController],
  providers: [HotmartService],
  exports: [HotmartService],
})
export class HotmartModule {}

