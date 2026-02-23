import { z } from "zod";

const envSchema = z.object({
  // API Configuration
  EXPO_PUBLIC_API_URL: z.string().default("http://localhost:8000/api"),

  // Stripe
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Feature Flags
  EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: z.string().optional(),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z.string().optional(),

  // Google OAuth
  EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID: z.string().optional(),

  // Deep Linking
  EXPO_PUBLIC_WEB_HOST: z.string().default("app.lifeplace.dev"),

  // Session Configuration
  EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES: z.string().optional(),
  EXPO_PUBLIC_SESSION_WARNING_MINUTES: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    if (!__DEV__) {
      throw new Error(`Invalid environment variables:\n${formatted}`);
    }

    console.warn(`[env] Invalid environment variables:\n${formatted}`);

    // Return the raw values in dev so the app can still run
    return process.env as unknown as Env;
  }

  return result.data;
}

export const env = validateEnv();
