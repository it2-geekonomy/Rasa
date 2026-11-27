import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  venueId: string;

  @ApiPropertyOptional({ example: 'Evening show', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  sessionName?: string;

  @ApiProperty({ example: '2027-01-08T13:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ example: '2027-01-08T16:30:00.000Z' })
  @IsISO8601()
  endAt: string;

  @ApiPropertyOptional({ example: 25, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 999, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: '2026-12-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  bookingOpenAt?: string;

  @ApiPropertyOptional({ example: '2027-01-08T12:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  bookingCloseAt?: string;

  @ApiPropertyOptional({ enum: SessionStatus, default: SessionStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}

export class ListSessionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
