import { z } from 'zod';

const databaseSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
});

export function databaseOptions(
  environment: Record<string, string | undefined> = process.env,
) {
  const parsed = databaseSchema.safeParse(environment);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid database configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const env = parsed.data;
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: {
      rejectUnauthorized:
        Boolean(environment.DB_SSL_CA) ||
        environment.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      ...(environment.DB_SSL_CA
        ? { ca: environment.DB_SSL_CA.replace(/\\n/g, '\n') }
        : {}),
    },
    timezone: 'Z',
  };
}
