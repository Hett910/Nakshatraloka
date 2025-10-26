const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet')
const passport = require('passport');
const hpp = require('hpp');
const createError = require('http-errors');
const rateLimiter = require('express-rate-limit');
const path = require('path');
const MasterRouter = require('./router/MasterRoute.js');
const { connectRedis, redis } = require('./utils/redisClient.js');


dotenv.config({ debug: false });
const app = express();
// app.use(cors({ origin: "http://localhost:5173" }));
app.use(cors({ origin: "*", credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));


// Disable Express signature
app.disable("x-powered-by");

// for parsig data
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from uploads folder

// app.use(express.json());
// app.use(express.urlencoded({ extended: true })); // for form data


// Allowing cors
// app.use(cors({ origin: process.env.CLIENT_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));


// for security and sanitazation of request
app.use(helmet());
app.use(hpp());

//Rate Limited
const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                  // limit each IP to 100 requests per window
    standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,      // Disable `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again after 15 minutes"
});


// Apply globally
app.use(limiter);


(async () => {
    if (process.env.USE_REDIS === 'true') {
        await connectRedis();
        const pong = await redis.ping();
        console.log("Redis ping:", pong);
    } else {
        console.log("⚠️ Redis is disabled (USE_REDIS=false)");
    }
})();


app.use("/", MasterRouter);



app.use(passport.initialize());

// Default Router Message
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Navigate to the API URL with the valid End-Points."
    });
});


//For Throwing error about not found
app.use(async (req, res, next) => {
    next(createError.NotFound("Invalid url-please refer document."));
});

// Error Handler
app.use((error, req, res, next) => {
    const status = error.status || 500;
    console.log("Error:", error);
    res.status(status).json({
        success: false,
        message: status === 500 ? "Internal Server Error" : error.message
    });
});

module.exports = app;