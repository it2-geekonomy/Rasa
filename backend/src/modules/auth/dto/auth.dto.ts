import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@rasafest.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterUserDto {
  @ApiProperty({ example: 'admin@rasafest.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Festival Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'AdminPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
