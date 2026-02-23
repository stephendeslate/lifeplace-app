import { z } from 'zod';

const envSchema = z.object({
  // Vite built-ins
  MODE: z.enum(['development', 'production', 'test']),
  DEV: z.boolean(),
  PROD: z.boolean(),
  SSR: z.boolean(),

  // API Configuration
  VITE_API_URL: z.string().optional(),

  // Sentry
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_RELEASE: z.string().optional(),

  // Stripe
  VITE_STRIPE_PUBLIC_KEY: z.string().optional(),

  // Environment
  VITE_ENV: z.string().optional(),

  // Debug
  VITE_DEBUG: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    if (import.meta.env.PROD) {
      throw new Error(`Invalid environment variables:\n${formatted}`);
    }

    console.warn(`[env] Invalid environment variables:\n${formatted}`);

    // Return the raw values in dev so the app can still run
    return import.meta.env as unknown as Env;
  }

  return result.data;
}

export const env = validateEnv();
