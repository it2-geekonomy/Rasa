import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AttendeeDto {
  @ApiProperty({ example: 'Asha Rao', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'asha@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '9845012345' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{8,20}$/)
  phone?: string;
}

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventSessionId: string;

  @ApiPropertyOptional({
    description: 'Seat hold token. Required for a seat-based session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  holdToken?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    description: 'Participant count. Required for capacity-based and free sessions.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;

  @ApiPropertyOptional({ type: [AttendeeDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];

  @ApiProperty({ example: 'Asha Rao', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  customerName: string;

  @ApiProperty({ example: 'asha@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ example: '9845012345' })
  @IsString()
  @Matches(/^[0-9+\-\s]{8,20}$/)
  customerPhone: string;
}

export class BookingStatusQueryDto {
  @ApiProperty({ example: 'asha@example.com' })
  @IsEmail()
  email: string;
}

export class BookingLookupQueryDto extends BookingStatusQueryDto {
  @ApiProperty({ example: 'RASA1A2B3C4D5E' })
  @IsString()
  @MaxLength(50)
  reference: string;
}
