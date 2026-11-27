import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import {
  HoldSeatsDto,
  ListInventoryQueryDto,
  ReleaseHoldDto,
  UpdateAllocationDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('sessions')
export class SessionInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Public()
  @Get(':id/availability')
  @ApiOperation({
    summary: 'Public seating map or remaining workshop capacity',
  })
  availability(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.availability(id);
  }

  @Public()
  @Post(':id/holds')
  @ApiOperation({ summary: 'Hold available RASA seats for 5 minutes' })
  hold(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HoldSeatsDto) {
    return this.inventory.hold(id, dto);
  }

  @Public()
  @Post(':id/holds/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a seat hold before it expires' })
  release(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReleaseHoldDto) {
    return this.inventory.releaseHold(id, dto.holdToken);
  }

  @Get(':id/inventory')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seat inventory counts for a session' })
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.summary(id);
  }

  @Post(':id/inventory')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add any new physical seats missing from this session' })
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.sync(id);
  }

  @Get(':id/seats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List session seats with allocation and status' })
  findSeats(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListInventoryQueryDto) {
    return this.inventory.findSeats(id, query);
  }

  @Patch(':id/seats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update allocation, availability, or price for session seats' })
  updateSeats(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAllocationDto) {
    return this.inventory.updateAllocation(id, dto);
  }
}
