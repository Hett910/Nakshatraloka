// redisClient.js
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redis.on('error', (err) => console.error('Redis error', err));

async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}
module.exports = { redis, connectRedis };
