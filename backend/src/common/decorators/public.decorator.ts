import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT authentication — used for public routes */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
