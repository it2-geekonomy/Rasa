import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SeatType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateSectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  venueId: string;

  @ApiProperty({ example: 'Upper Left', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  sectionName: string;

  @ApiProperty({ example: 'UL', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  sectionCode: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  layoutMetadata?: Record<string, unknown>;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}

export class ListSectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  venueId?: string;
}

export class CreateSeatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ example: 'A', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  rowLabel: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiProperty({ example: 'A-1', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  seatLabel: string;

  @ApiPropertyOptional({ enum: SeatType, default: SeatType.NORMAL })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  xPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yPosition?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSeatDto extends PartialType(CreateSeatDto) {}

export class ListSeatsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  rowLabel?: string;

  @ApiPropertyOptional({ enum: SeatType })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @ApiPropertyOptional({ example: 'A-1' })
  @IsOptional()
  @IsString()
  seatLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
