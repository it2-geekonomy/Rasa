import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationOwner, EventSeatStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class HoldSeatsDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 10 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  eventSeatIds: string[];
}

export class ReleaseHoldDto {
  @ApiProperty({ description: 'Token returned when the seats were held' })
  @IsString()
  @MaxLength(64)
  holdToken: string;
}

export class UpdateAllocationDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  eventSeatIds?: string[];

  @ApiPropertyOptional({ example: 'UL' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sectionCode?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  rowLabel?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatNumberFrom?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatNumberTo?: number;

  @ApiPropertyOptional({ enum: AllocationOwner })
  @IsOptional()
  @IsEnum(AllocationOwner)
  allocationOwner?: AllocationOwner;

  @ApiPropertyOptional({ enum: ['AVAILABLE', 'BLOCKED'] })
  @IsOptional()
  @IsIn(['AVAILABLE', 'BLOCKED'])
  status?: 'AVAILABLE' | 'BLOCKED';

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}

export class ListInventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'UL' })
  @IsOptional()
  @IsString()
  sectionCode?: string;

  @ApiPropertyOptional({ example: 'ZC' })
  @IsOptional()
  @IsString()
  rowLabel?: string;

  @ApiPropertyOptional({ enum: AllocationOwner })
  @IsOptional()
  @IsEnum(AllocationOwner)
  allocationOwner?: AllocationOwner;

  @ApiPropertyOptional({ enum: EventSeatStatus })
  @IsOptional()
  @IsEnum(EventSeatStatus)
  status?: EventSeatStatus;
}
