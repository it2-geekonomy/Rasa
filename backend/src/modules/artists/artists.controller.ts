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
import { Public } from '../../common/decorators/public.decorator';
import { ArtistsService } from './artists.service';
import { CreateArtistDto, ListArtistsQueryDto, UpdateArtistDto } from './dto/artist.dto';

@ApiTags('Artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an artist' })
  create(@Body() dto: CreateArtistDto) {
    return this.artistsService.create(dto);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List active artists for the public website' })
  findAllPublic(@Query() query: ListArtistsQueryDto) {
    return this.artistsService.findAllPublic(query);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get an active artist by slug with photos and published events' })
  findBySlug(@Param('slug') slug: string) {
    return this.artistsService.findBySlug(slug);
  }

  @Get()
  @ApiOperation({ summary: 'List artists' })
  findAll(@Query() query: ListArtistsQueryDto) {
    return this.artistsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artist with photos and linked events' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.artistsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an artist and gallery photos' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an artist' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.artistsService.remove(id);
  }
}
