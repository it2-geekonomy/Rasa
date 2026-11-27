import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ListPaymentsQueryDto, VerifyPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a Razorpay checkout signature and confirm the booking' })
  verify(@Body() dto: VerifyPaymentDto) {
    return this.payments.verify(dto);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook. Signature is checked against the raw body.' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature = '',
    @Body() body: unknown,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Webhook raw body is missing');
    }
    return this.payments.handleWebhook(req.rawBody, signature, body);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments' })
  findAll(@Query() query: ListPaymentsQueryDto) {
    return this.payments.findAll(query);
  }
}
