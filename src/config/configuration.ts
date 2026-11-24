const int = (value: string | undefined, fallback: number) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default () => ({
  app: {
    name: process.env.APP_NAME || 'ELO',
    env: process.env.NODE_ENV || 'development',
    port: int(process.env.PORT, 3000),
    prefix: process.env.API_PREFIX || 'api/v1',
    isProduction: process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
    enableDocs: process.env.ENABLE_DOCS
      ? process.env.ENABLE_DOCS === 'true'
      : process.env.NODE_ENV !== 'production',
  },

  // Mantido por compatibilidade com código existente que lê `node.env`
  node: {
    env: process.env.NODE_ENV || 'development',
    port: int(process.env.PORT, 3000),
  },

  database: {
    url: process.env.DATABASE_URL,
    logQueries: process.env.DB_LOG_QUERIES === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    mfaChallengeExpiration: process.env.MFA_CHALLENGE_EXPIRATION || '5m',
  },

  security: {
    bcryptSaltRounds: int(process.env.BCRYPT_SALT_ROUNDS, 12),
    maxLoginAttempts: int(process.env.MAX_LOGIN_ATTEMPTS, 5),
    lockoutMinutes: int(process.env.LOCKOUT_MINUTES, 30),
    otpTtlSeconds: int(process.env.OTP_TTL_SECONDS, 300),
    // Só para desenvolvimento local: escreve o OTP no log. Ignorado em produção.
    debugOtp: process.env.AUTH_DEBUG_OTP === 'true' && process.env.NODE_ENV !== 'production',
  },

  throttle: {
    ttlMs: int(process.env.THROTTLE_TTL_MS, 60_000),
    limit: int(process.env.THROTTLE_LIMIT, 120),
  },

  cors: {
    // Lista separada por vírgulas. Em desenvolvimento, aceita a rede local.
    origins: list(process.env.ALLOWED_ORIGINS),
  },

  ministry: {
    allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS).length
      ? list(process.env.ALLOWED_EMAIL_DOMAINS)
      : ['@mint.gov.mz', '@policia.gov.mz', '@prisoes.gov.mz', '@migracao.gov.mz'],
    nipLength: { min: 6, max: 10 },
    biLength: 13,
    nuitLength: 9,
  },
});
