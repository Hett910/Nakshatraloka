
// // postgres.connection.js
// const { Client } = require('pg');

// const client = new Client({
//     host: process.env.PG_HOST || "localhost",
//     port: process.env.PG_PORT || 5432,
//     user: process.env.PG_USER || "postgres",
//     database: process.env.PG_DATABASE || "Nakshatraloka",
//     password: process.env.PG_PASSWORD || "sa"
// });

// // Connect to PostgreSQL
// client.connect()
//     .then(() => {
//         console.log('✅ Connected to PostgreSQL successfully');
//     })
//     .catch((err) => {
//         console.error('❌ Error connecting to PostgreSQL:', err);
//         process.exit(1); // Exit if DB fails in production
//     });

// // Listen for end/close events
// client.on('end', () => {
//     console.log('🔒 PostgreSQL connection closed');
// });

// client.on('error', (err) => {
//     console.error('⚠️ PostgreSQL connection error:', err);
// });

// // Graceful shutdown on app termination
// process.on("SIGINT", async () => {
//     console.log("🛑 Closing PostgreSQL connection...");
//     await client.end();
//     process.exit();
// });

// module.exports = client;


// postgres.connection.js
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || "postgres",
    database: process.env.PG_DATABASE || "Nakshatraloka",
    password: process.env.PG_PASSWORD || "sa",
    max: 20,               // ✅ max connections in pool
    idleTimeoutMillis: 30000, // close idle connections after 30s
    connectionTimeoutMillis: 2000 // timeout if no connection in 2s
});

// Test connection (optional)
pool.connect()
    .then(client => {
        console.log('✅ Connected to PostgreSQL successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error connecting to PostgreSQL:', err);
        process.exit(1);
    });

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("🛑 Closing PostgreSQL pool...");
    await pool.end();
    process.exit();
});

module.exports = pool;  // ✅ export pool, not client
