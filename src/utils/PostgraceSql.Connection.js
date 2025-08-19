// postgres.connection.js
const { Client } = require('pg');

const client = new Client({
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || "postgres",
    database: process.env.PG_DATABASE || "Nakshatraloka",
    password: process.env.PG_PASSWORD || "sa"
});

// Connect to PostgreSQL
client.connect()
    .then(() => {
        console.log('✅ Connected to PostgreSQL successfully');
    })
    .catch((err) => {
        console.error('❌ Error connecting to PostgreSQL:', err);
        process.exit(1); // Exit if DB fails in production
    });

// Listen for end/close events
client.on('end', () => {
    console.log('🔒 PostgreSQL connection closed');
});

client.on('error', (err) => {
    console.error('⚠️ PostgreSQL connection error:', err);
});

// Graceful shutdown on app termination
process.on("SIGINT", async () => {
    console.log("🛑 Closing PostgreSQL connection...");
    await client.end();
    process.exit();
});

module.exports = client;