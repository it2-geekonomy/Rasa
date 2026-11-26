import { Module } from '@nestjs/common';
import { CheckinsController } from './checkins.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, CheckinsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
