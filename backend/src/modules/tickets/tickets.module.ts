import { Module } from '@nestjs/common';
import { CheckinsController } from './checkins.controller';
import { TicketsController } from './tickets.controller';
import { TicketMailer } from './ticket-mailer.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, CheckinsController],
  providers: [TicketsService, TicketMailer],
  exports: [TicketsService, TicketMailer],
})
export class TicketsModule {}
