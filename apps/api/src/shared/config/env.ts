import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Render injeta PORT; localmente preferimos API_PORT. Resolvemos ambos.
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3334),
  API_HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:5174,http://localhost:5175'),

  STORAGE_MODE: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  PORTAL_URL: z.string().default('http://localhost:5174'),
  LANDING_URL: z.string().default('http://localhost:5175'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Render usa PORT; em dev usamos API_PORT. Centralizamos aqui.
export const env = {
  ...parsed.data,
  API_PORT: parsed.data.PORT ?? parsed.data.API_PORT,
}
