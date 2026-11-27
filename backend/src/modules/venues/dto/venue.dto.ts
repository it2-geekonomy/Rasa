import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { VenueType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateVenueDto {
  @ApiProperty({ example: 'Auditorium', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: VenueType, example: VenueType.RESERVED_SEATING })
  @IsEnum(VenueType)
  venueType: VenueType;

  @ApiPropertyOptional({ example: 'Reserved-seating auditorium.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1075, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalCapacity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class ListVenuesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'audit' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VenueType })
  @IsOptional()
  @IsEnum(VenueType)
  venueType?: VenueType;

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
