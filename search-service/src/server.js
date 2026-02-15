//This service is used for searching. for eg. search page on insta has posts db and search db 
//it uses posts db to load the content and for searching(ids, accs, etc.) uses search db 
//so that posts db does not get overloaded and the load is split properly.

//The search db is exactly same as posts db so whenever a post is added to or deleted 
//from posts db then it should also be added to or deleted from search db.

// **It is used to reduce the load** 

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");

const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");

const searchRoutes = require("./routes/searchRoutes");
const { handlePostCreated, handlePostDeleted } = require("./event-handlers/search-event-handlers");

const app = express();
const PORT = process.env.PORT;

//middleware

app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("Connected to DB successfully"))
    .catch(e => logger.error("DB Connection error", e))

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
})

const redisClient = new Redis(process.env.REDIS_URL);

app.use("/api/search",(req, res, next) =>{
    req.redisClient = redisClient;
    next();
}, searchRoutes);

//ratelimiting
//DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 3, // this means 3 requests can happen in 1 sec
    duration: 1  // 3 reqs in 1sec max
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
        sendCommand: (...args) => redisClient.call(...args),
    })

})

app.use(errorHandler);

const port = process.env.PORT;

async function startServer() {

    try {

        await connectToRabbitMQ();
        app.listen(port, () => {
            console.log(`Server is Running on port ${port}`);
            logger.info(`Post Service is Running on port ${port} :)`);
        })

        //consume or subscribe to the post creation event
        await consumeEvent("post.created", handlePostCreated);
        await consumeEvent("post.delete", handlePostDeleted);

    } catch (e) {
        logger.error(e, "Failed to start Search Service");
        process.exit(1);
    }
}

startServer();