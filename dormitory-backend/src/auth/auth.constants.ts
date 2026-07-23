export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'defaultJwtSecret',
  expiresIn: '1h' as const,
};
