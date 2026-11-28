import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { SessionsModule } from '../sessions/sessions.module';
import { PaymentsModule } from '../payments/payments.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [SessionsModule, PaymentsModule, TicketsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
