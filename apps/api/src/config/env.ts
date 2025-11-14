import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // API
  API_PORT: z.coerce.number().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Keycloak (optional)
  KEYCLOAK_URL: z.string().url().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  KEYCLOAK_CLIENT_ID: z.string().optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
  KEYCLOAK_DISCOVERY_URL: z.string().url().optional(),
  
  // Security (optional for dev)
  JWT_SECRET: z.string().min(8).optional(),
  SESSION_SECRET: z.string().min(8).optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Metrics
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().default(9090),
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
    JWT_SECRET: cleanEnv.JWT_SECRET || 'dev-secret-key-for-testing-only-min-32-chars',
    SESSION_SECRET: cleanEnv.SESSION_SECRET || 'dev-session-secret-for-testing-min-32-chars',
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

