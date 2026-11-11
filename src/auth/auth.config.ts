export function jwtSecret(
  name: 'JWT_ACCESS_TOKEN_SECRET' | 'JWT_REFRESH_TOKEN_SECRET',
  environment: Record<string, string | undefined> = process.env,
): string {
  const value = environment[name];
  if (!value?.trim())
    throw new Error(`Missing authentication configuration: ${name}`);
  return value;
}
