// const { createClient } = require("redis");

// const redis = createClient({ url: process.env.REDIS_URL });

// redis.on("error", (err) => console.error("❌ Redis error:", err));
// redis.on("connect", () => console.log("✅ Redis connected"));
// redis.on("ready", () => console.log("🚀 Redis ready to use"));


// /**
//  * Connect to Redis if not already connected.
//  * @returns {Promise<void>} Resolves when Redis connection is established.
//  */
// async function connectRedis() {
//   if (!redis.isOpen) await redis.connect();
// }

// module.exports = { redis, connectRedis };


// ---------------------------- FOR LOCAL UP SIDE CODE ---------------------------

// utils/redisClient.js
const { createClient } = require("redis");

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: retries => Math.min(retries * 50, 1000),
  }
});

redis.on("error", (err) => console.error("❌ Redis error:", err));
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("🚀 Redis ready to use"));

async function connectRedis() {
  if (!redis.isOpen) {
    try {
      await redis.connect();
    } catch (err) {
      console.error("Failed to connect Redis:", err);
    }
  }
}

// Simple cache utility functions
const redisUtils = {
  // Get cached data
  async get(key) {
    try {
      if (!redis.isOpen) await connectRedis();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  // Set cache with TTL
  async set(key, data, ttl = 600) { // default 10 minutes
    try {
      if (!redis.isOpen) await connectRedis();
      await redis.set(key, JSON.stringify(data), { EX: ttl });
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  },

  // Delete cache by key
  async del(key) {
    try {
      if (!redis.isOpen) await connectRedis();
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  },

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      if (!redis.isOpen) await connectRedis();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        // console.log(`🗑️ Deleted ${keys.length} keys with pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      console.error(`Redis pattern delete error for ${pattern}:`, error);
      return false;
    }
  },

  // Simple cache helper - get from cache or fetch fresh
  async cacheable(key, fetchCallback, ttl = 600) {
    // Try cache first
    const cached = await this.get(key);
    if (cached) {
      // console.log(`📦 Serving from cache: ${key}`);
      return { data: cached, cached: true };
    }

    // Fetch fresh data
    const freshData = await fetchCallback();
    if (freshData) {
      await this.set(key, freshData, ttl);
      // console.log(`💾 Stored ifn cache: ${key}`);
    }

    return { data: freshData, cached: false };
  }
};

module.exports = { 
  redis, 
  connectRedis,
  redisUtils 
};

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
