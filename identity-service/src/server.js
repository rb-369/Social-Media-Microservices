require("dotenv").config();

const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit")
const {RedisStore} = require("rate-limit-redis");
const routes = require("./routes/identity-service");
const errorHandler = require("./middlewares/errorHandler");

const app = express();



//connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("Connected to DB successfully"))
    .catch(e => logger.error("DB Connection error", e))

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
})

app.use("/api", routes);

//DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 10, // this means 10 requests can happen in 1 sec
    duration: 1  // 10 reqs in 1sec max
})

app.use((req, res, next) => {
    rateLimiter.consume(req.ip).then(() => next()).catch(() => {
        logger.warn(`Rate Limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many Requests!!"
        })
    })
})

// IP based rate limiting for sensitve endpoints
const sensitiveEndPointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 mins
    max: 50, // Max 50 Requests in 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn("Sensitive endpoint rate limit exceeded for IP: " + req.ip)
        res.status(429).json({
            success: false,
            message: "Too many Requests!!!!!"
        })
    },
    store: new RedisStore({
        sendCommand: (...args)=> redisClient.call(...args),
    })

})

//apply this sensitiveEndPointsLimiter to our routes
app.use("/api/auth/register", sensitiveEndPointsLimiter);

//use Router
app.use("/api/auth", routes);

//error handler
app.use(errorHandler);

const port = process.env.PORT;
app.listen(port, ()=>{
    console.log(`Server is Running on port ${port}`);
    logger.info(`Identity Service is Running on port ${port} :)`);
})

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise)=>{
    logger.error("Unhandled Rejection At ", promise, "reason: ", reason)
})