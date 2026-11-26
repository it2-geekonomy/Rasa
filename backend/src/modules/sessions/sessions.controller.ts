import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSessionDto, ListSessionsQueryDto, UpdateSessionDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an event session' })
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List event sessions' })
  findAll(@Query() query: ListSessionsQueryDto) {
    return this.sessionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event session' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event session' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a session that has no inventory or bookings' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.remove(id);
  }
}
