import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListTicketsQueryDto, ValidateTicketDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Public()
  @Get('public/:token')
  @ApiOperation({ summary: 'Public read-only ticket details for phone QR scans' })
  publicLookup(@Param('token') token: string) {
    return this.tickets.publicLookup(token);
  }

  @Get()
  @ApiOperation({ summary: 'List issued tickets' })
  findAll(@Query() query: ListTicketsQueryDto) {
    return this.tickets.findAll(query);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up a QR token without checking the ticket in' })
  validate(@Body() dto: ValidateTicketDto) {
    return this.tickets.validate(dto.qrToken);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.findOne(id);
  }
}
