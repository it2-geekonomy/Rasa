import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckInDto, ListCheckinsQueryDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

type AdminToken = { id: string };

@ApiTags('Check-in')
@ApiBearerAuth()
@Controller('checkins')
export class CheckinsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a ticket from its QR token' })
  checkIn(@Body() dto: CheckInDto, @CurrentUser() admin: AdminToken) {
    return this.tickets.checkIn(dto, admin.id);
  }

  @Get()
  @ApiOperation({ summary: 'List check-in attempts' })
  findAll(@Query() query: ListCheckinsQueryDto) {
    return this.tickets.findCheckins(query);
  }
}
