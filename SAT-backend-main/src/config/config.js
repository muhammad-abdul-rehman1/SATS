export const config = {
    production: process.env.NODE_ENV === 'production',
    port: process.env.PORT || 4000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    corsOrigin: process.env.CORS_ORIGIN || '*'
};