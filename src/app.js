const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet')
const hpp = require('hpp');
const createError = require('http-errors');
const rateLimiter = require('express-rate-limit');


dotenv.config();
const app = express();

// Disable Express signature
app.disable("x-powered-by");

// for parsig data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data

// Allowing cors
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));


// for security and sanitazation of request
app.use(helmet());
app.use(hpp());

//Rate Limited
app.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}))

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
    res.status(status).json({
        success: false,
        message: status === 500 ? "Internal Server Error" : error.message
    });
});

module.exports = app;