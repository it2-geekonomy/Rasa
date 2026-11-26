import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterUserDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.AUTH_JWT_SECRET ?? 'rasa-fest-secret-key-change-in-production-2026';
  private readonly jwtExpiresIn = parseInt(
    process.env.AUTH_JWT_EXPIRES_IN ?? '86400',
    10,
  );

  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    const passwordOk = admin
      ? await bcrypt.compare(dto.password, admin.passwordHash)
      : false;

    if (!admin || !passwordOk || !admin.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn },
    );

    return {
      accessToken: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
      },
    };
  }

  async registerInitialAdmin(dto: RegisterUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.adminUser.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  verifyToken(token: string) {
    return jwt.verify(token, this.jwtSecret);
  }
}
