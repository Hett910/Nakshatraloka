const { createClient } = require("redis");

const redis = createClient({ url: process.env.REDIS_URL });

redis.on("error", (err) => console.error("❌ Redis error:", err));
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("🚀 Redis ready to use"));

async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}

module.exports = { redis, connectRedis };

// FOR PRODUCTION GPT GIVES

// const { createClient } = require("redis");

// const redis = createClient({
//   url: process.env.REDIS_URL,
//   socket: {
//     reconnectStrategy: retries => Math.min(retries * 50, 1000), // retry every 50ms up to 1s
//   }
// });

// redis.on("error", (err) => console.error("❌ Redis error:", err));
// redis.on("connect", () => console.log("✅ Redis connected"));
// redis.on("ready", () => console.log("🚀 Redis ready to use"));

// async function connectRedis() {
//   if (!redis.isOpen) {
//     try {
//       await redis.connect();
//     } catch (err) {
//       console.error("Failed to connect Redis:", err);
//     }
//   }
// }

// module.exports = { redis, connectRedis };
