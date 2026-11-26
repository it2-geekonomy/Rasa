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
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
});
