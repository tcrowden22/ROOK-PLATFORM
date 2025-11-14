import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // Gateway
  GATEWAY_PORT: z.coerce.number().default(35000),
  GATEWAY_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  API_KEY_SECRET: z.string().min(32).optional(), // Secret for API key hashing
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000), // milliseconds
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  // Filter out empty strings (treat as undefined for optional fields)
  const cleanEnv: Record<string, any> = {};
  for (const [key, value] of Object.entries(process.env)) {
    cleanEnv[key] = value === '' ? undefined : value;
  }
  
  // Set defaults for development
  const envWithDefaults = {
    DATABASE_URL: cleanEnv.DATABASE_URL || 'postgresql://rook_app:changeme_app_password@localhost:5432/rook',
    API_KEY_SECRET: cleanEnv.API_KEY_SECRET || 'dev-gateway-secret-key-min-32-chars-for-testing-only',
    ...cleanEnv,
  };
  env = envSchema.parse(envWithDefaults);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };


