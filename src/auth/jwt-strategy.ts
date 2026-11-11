import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { z } from 'zod';
import { UsersService } from '../users/users.service';
import { jwtSecret } from './auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: unknown) {
    const parsed = z
      .object({ sub: z.number().int().positive() })
      .safeParse(payload);
    if (!parsed.success) throw new UnauthorizedException();
    const user = await this.usersService.findById(parsed.data.sub);
    if (!user) throw new UnauthorizedException();
    return {
      userId: user.id,
      username: user.username,
      role: user.role ?? 'user',
    };
  }
}
