import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListBookingsQueryDto } from '../payments/dto/payment.dto';
import { BookingsService } from './bookings.service';
import {
  BookingLookupQueryDto,
  BookingStatusQueryDto,
  CancelPendingBookingsDto,
  CreateBookingDto,
  CreateCartBookingDto,
} from './dto/booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a booking from a seat hold or workshop capacity' })
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  @Public()
  @Post('cart')
  @ApiOperation({ summary: 'Create multiple bookings from a cart with one combined payment' })
  createCart(@Body() dto: CreateCartBookingDto) {
    return this.bookings.createCart(dto);
  }

  @Public()
  @Post('cancel-pending')
  @ApiOperation({ summary: 'Cancel unpaid pending bookings and release their held seats' })
  cancelPending(@Body() dto: CancelPendingBookingsDto) {
    return this.bookings.cancelPending(dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookings' })
  findAll(@Query() query: ListBookingsQueryDto) {
    return this.bookings.findAll(query);
  }

  @Public()
  @Get('lookup')
  @ApiOperation({ summary: 'Customer tickets by booking reference and email' })
  lookup(@Query() query: BookingLookupQueryDto) {
    return this.bookings.lookup(query.reference, query.email);
  }

  @Public()
  @Get(':id/status')
  @ApiOperation({ summary: 'Customer booking status. Email must match the booking.' })
  status(@Param('id', ParseUUIDPipe) id: string, @Query() query: BookingStatusQueryDto) {
    return this.bookings.status(id, query.email);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a booking' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(id);
  }

  @Public()
  @Post(':id/payments')
  @ApiOperation({ summary: 'Start another Razorpay attempt for a pending booking' })
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.retryCheckout(id);
  }
}
