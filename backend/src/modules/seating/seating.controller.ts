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
import {
  CreateSeatDto,
  CreateSectionDto,
  ListSeatsQueryDto,
  ListSectionsQueryDto,
  UpdateSeatDto,
  UpdateSectionDto,
} from './dto/seating.dto';
import { SeatingService } from './seating.service';

@ApiTags('Seating')
@ApiBearerAuth()
@Controller('seating/sections')
export class SectionsController {
  constructor(private readonly seatingService: SeatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a seating section' })
  create(@Body() dto: CreateSectionDto) {
    return this.seatingService.createSection(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List seating sections' })
  findAll(@Query() query: ListSectionsQueryDto) {
    return this.seatingService.findSections(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a seating section' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatingService.findSection(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a seating section' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSectionDto) {
    return this.seatingService.updateSection(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a seating section that has no seats' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatingService.removeSection(id);
  }
}

@ApiTags('Seating')
@ApiBearerAuth()
@Controller('seating/seats')
export class SeatsController {
  constructor(private readonly seatingService: SeatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a physical seat' })
  create(@Body() dto: CreateSeatDto) {
    return this.seatingService.createSeat(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List physical seats' })
  findAll(@Query() query: ListSeatsQueryDto) {
    return this.seatingService.findSeats(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a physical seat' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatingService.findSeat(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a physical seat' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSeatDto) {
    return this.seatingService.updateSeat(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a physical seat that is not allocated to a session' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatingService.removeSeat(id);
  }
}
