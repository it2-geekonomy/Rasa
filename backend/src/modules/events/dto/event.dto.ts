import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BookingMode, EventStatus, EventType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EVENT_CATEGORIES } from '../event-categories';

export class CreateEventDto {
  @ApiProperty({ example: 'Agam Band', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'agam-band', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({ enum: EVENT_CATEGORIES, example: 'Performance' })
  @IsIn(EVENT_CATEGORIES)
  category: string;

  @ApiProperty({ enum: EventType, example: EventType.PERFORMANCE })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: BookingMode, example: BookingMode.SEAT_BASED })
  @IsEnum(BookingMode)
  bookingMode: BookingMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ListEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'agam' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EVENT_CATEGORIES })
  @IsOptional()
  @IsIn(EVENT_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: BookingMode })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
