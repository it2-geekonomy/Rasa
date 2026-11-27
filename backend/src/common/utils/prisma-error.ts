import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrisma(
  error: unknown,
  messages: { unique?: string; inUse?: string },
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException(messages.unique ?? 'A matching record already exists');
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      throw new ConflictException(
        messages.inUse ?? 'This record is in use and cannot be changed',
      );
    }
  }
  throw error;
}
