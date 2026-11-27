export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '6060', 10),
  databaseUrl: process.env.DATABASE_URL,
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET ?? 'rasa-fest-secret-key-change-in-production-2026',
    jwtExpiresIn: parseInt(process.env.AUTH_JWT_EXPIRES_IN ?? '86400', 10),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? '',
    endpoint: process.env.R2_ENDPOINT ?? '',
    publicUrl: (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, ''),
    region: process.env.R2_REGION ?? 'auto',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.RESEND_FROM_EMAIL ?? '',
  },
  holds: {
    ttlMinutes: parseInt(process.env.HOLD_TTL_MINUTES ?? '10', 10),
  },
});
