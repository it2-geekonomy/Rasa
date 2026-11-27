import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { SessionInventoryController } from './session-inventory.controller';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, SessionInventoryController],
  providers: [SessionsService, InventoryService],
  exports: [SessionsService, InventoryService],
})
export class SessionsModule {}
