const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet')
const passport = require('passport');
const hpp = require('hpp');
const createError = require('http-errors');
const rateLimiter = require('express-rate-limit');
const MasterRouter = require('./router/MasterRoute.js');
const { connectRedis, redis } = require('./utils/redisClient.js');


dotenv.config({ debug: false });
const app = express();


// Disable Express signature
app.disable("x-powered-by");

// for parsig data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data

// Allowing cors
app.use(cors({ origin: "*", credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
// app.use(cors({ origin: process.env.CLIENT_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));


// for security and sanitazation of request
app.use(helmet());
app.use(hpp());

//Rate Limited
// app.use(rateLimiter({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     standardHeaders: true,
//     legacyHeaders: false,
// }))


// Connect Redis before handling routes

(async () => {
    await connectRedis();
    const pong = await redis.ping();
    console.log("Redis ping:", pong); // should print "PONG"
})();


app.use("/", MasterRouter);

app.use(passport.initialize());

// Default Router Message
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Navigate to the API URL with valid End-Points."
    });
});


// Catch-all 404 (at the very end)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Invalid url-please refer document." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

module.exports = app;