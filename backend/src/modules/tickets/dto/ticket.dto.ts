import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckinStatus, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ValidateTicketDto {
  @ApiProperty({ description: 'Value encoded in the QR code. This is the ticket token only.' })
  @IsString()
  @MaxLength(255)
  qrToken: string;
}

export class CheckInDto extends ValidateTicketDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'When set, a ticket for another session is rejected.',
  })
  @IsOptional()
  @IsUUID()
  eventSessionId?: string;
}

export class ListTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventSessionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ListCheckinsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventSessionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bookingTicketId?: string;

  @ApiPropertyOptional({ enum: CheckinStatus })
  @IsOptional()
  @IsEnum(CheckinStatus)
  checkinStatus?: CheckinStatus;
}
