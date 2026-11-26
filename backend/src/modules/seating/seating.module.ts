import { Module } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { SeatsController, SectionsController } from './seating.controller';

@Module({
  controllers: [SectionsController, SeatsController],
  providers: [SeatingService],
  exports: [SeatingService],
})
export class SeatingModule {}
