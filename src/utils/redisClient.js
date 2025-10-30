// utils/redisClient.js
const { createClient } = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const USE_REDIS = process.env.USE_REDIS === "true";

let redis = null;

if (USE_REDIS) {
  redis = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    },
  });

  redis.on("error", (err) => console.error("❌ Redis error:", err));
  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("ready", () => console.log("🚀 Redis ready to use"));
} else {
  console.log("⚠️ Redis is disabled (USE_REDIS=false)");
}

// Connect function (only if Redis is enabled)
async function connectRedis() {
  if (!USE_REDIS) return;

  try {
    if (!redis.isOpen) await redis.connect();
  } catch (err) {
    console.error("Failed to connect Redis:", err);
  }
}

// Utility wrapper that gracefully skips Redis calls if disabled
const redisUtils = {
  async get(key) {
    if (!USE_REDIS || !redis?.isOpen) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  async set(key, data, ttl = 600) {
    if (!USE_REDIS || !redis?.isOpen) return false;
    try {
      await redis.set(key, JSON.stringify(data), { EX: ttl });
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  },

  async del(key) {
    if (!USE_REDIS || !redis?.isOpen) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  },

  async delPattern(pattern) {
    if (!USE_REDIS || !redis?.isOpen) return false;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Redis pattern delete error for ${pattern}:`, error);
      return false;
    }
  },

  async cacheable(key, fetchCallback, ttl = 600) {
    if (!USE_REDIS || !redis?.isOpen) {
      // Skip cache entirely if disabled
      const data = await fetchCallback();
      return { data, cached: false };
    }

    try {
      const cached = await this.get(key);
      if (cached) return { data: cached, cached: true };

      const freshData = await fetchCallback();
      if (freshData) await this.set(key, freshData, ttl);
      return { data: freshData, cached: false };
    } catch (error) {
      console.error(`Redis cacheable error for ${key}:`, error);
      const data = await fetchCallback();
      return { data, cached: false };
    }
  },
};

module.exports = {
  redis,
  connectRedis,
  redisUtils,
};



// ---------------------------- FOR LOCAL UP SIDE CODE ---------------------------

// utils/redisClient.js
// const { createClient } = require("redis");

// const redis = createClient({
//   url: process.env.REDIS_URL,
//   socket: {
//     reconnectStrategy: retries => Math.min(retries * 50, 1000),
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

// // Simple cache utility functions
// const redisUtils = {
//   // Get cached data
//   async get(key) {
//     try {
//       if (!redis.isOpen) await connectRedis();
//       const data = await redis.get(key);
//       return data ? JSON.parse(data) : null;
//     } catch (error) {
//       console.error(`Redis get error for key ${key}:`, error);
//       return null;
//     }
//   },

//   // Set cache with TTL
//   async set(key, data, ttl = 600) { // default 10 minutes
//     try {
//       if (!redis.isOpen) await connectRedis();
//       await redis.set(key, JSON.stringify(data), { EX: ttl });
//       return true;
//     } catch (error) {
//       console.error(`Redis set error for key ${key}:`, error);
//       return false;
//     }
//   },

//   // Delete cache by key
//   async del(key) {
//     try {
//       if (!redis.isOpen) await connectRedis();
//       await redis.del(key);
//       return true;
//     } catch (error) {
//       console.error(`Redis delete error for key ${key}:`, error);
//       return false;
//     }
//   },

//   // Delete multiple keys by pattern
//   async delPattern(pattern) {
//     try {
//       if (!redis.isOpen) await connectRedis();
//       const keys = await redis.keys(pattern);
//       if (keys.length > 0) {
//         await redis.del(keys);
//         // console.log(`🗑️ Deleted ${keys.length} keys with pattern: ${pattern}`);
//       }
//       return true;
//     } catch (error) {
//       console.error(`Redis pattern delete error for ${pattern}:`, error);
//       return false;
//     }
//   },

//   // Simple cache helper - get from cache or fetch fresh
//   async cacheable(key, fetchCallback, ttl = 600) {
//     // Try cache first
//     const cached = await this.get(key);
//     if (cached) {
//       // console.log(`📦 Serving from cache: ${key}`);
//       return { data: cached, cached: true };
//     }

//     // Fetch fresh data
//     const freshData = await fetchCallback();
//     if (freshData) {
//       await this.set(key, freshData, ttl);
//       // console.log(`💾 Stored ifn cache: ${key}`);
//     }

//     return { data: freshData, cached: false };
//   }
// };

// module.exports = { 
//   redis, 
//   connectRedis,
//   redisUtils 
// };

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
