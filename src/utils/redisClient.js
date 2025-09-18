const { createClient } = require("redis");

const redis = createClient({ url: process.env.REDIS_URL });

redis.on("error", (err) => console.error("❌ Redis error:", err));
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("🚀 Redis ready to use"));

async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}

module.exports = { redis, connectRedis };
