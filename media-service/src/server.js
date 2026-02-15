require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middlewares/error-handler");
const logger = require("./utils/logger");
const mediaRoutes = require("./routes/media-routes");

const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./event-handlers/media-event-handlers");

const app = express();

//connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("Connected to DB successfully"))
    .catch(e => logger.error("DB Connection error", e))

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
})

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

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

const port = process.env.PORT;

async function startServer() {

    try {
        await connectToRabbitMQ();

        //consume all the events
        await consumeEvent("post.delete", handlePostDeleted);

        app.listen(port, () => {
            console.log(`MEDIA Service is Running on port ${port}`);
            logger.info(`MEDIA Service is Running on port ${port} :)`);
        })
    } catch (e) {
        logger.error("Error while Starting the MEDIA server. Failed To Connect to the MEDIA Server :(", e);
        process.exit(1);
    }
}

startServer();
