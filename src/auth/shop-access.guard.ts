import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';

const principalSchema = z.object({
  userId: z.number().int().positive(),
  username: z.string(),
  role: z.string(),
});
export type Principal = z.infer<typeof principalSchema>;
export type AuthenticatedRequest = { user: Principal };

export function principal(value: unknown): Principal {
  const parsed = principalSchema.safeParse(value);
  if (!parsed.success) throw new UnauthorizedException('Sign in to continue.');
  return parsed.data;
}

export function isStaff(role: string): boolean {
  return ['staff', 'admin', 'owner'].includes(role);
}

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!isStaff(principal(request.user).role))
      throw new ForbiddenException('Staff access required.');
    return true;
  }
}

@Injectable()
export class ShopAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<
        AuthenticatedRequest & { method: string; params: { resource: string } }
      >();
    const user = principal(request.user);
    const resource = request.params.resource;
    if (
      ['GET', 'HEAD'].includes(request.method) &&
      ['flowers', 'categories'].includes(resource)
    )
      return true;
    if (!isStaff(user.role))
      throw new ForbiddenException('Staff access required.');
    if (
      !['GET', 'HEAD'].includes(request.method) &&
      ['orders', 'order-items', 'payments', 'deliveries'].includes(resource)
    ) {
      throw new ForbiddenException('Use the transactional order endpoints.');
    }
    return true;
  }
}
