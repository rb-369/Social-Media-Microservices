require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy"); // to forward reqs from localhost:3000/v1/auth/register ---> localhost:3001/api/auth/register
const errorHandler = require("./middleware/errorhandler");
const { validateToken } = require("./middleware/auth-middleware");

const app = express();
const port = process.env.PORT;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

//rate limiting
const apiRateLimit = rateLimit({
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

app.use(apiRateLimit);

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, "/api")
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error("Proxy Error " + err?.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error! :(",
            error: err.message
        })
    }
}

//setting up proxy  for our identity service

app.use("/v1/auth", proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => { //A function to override most request options (e.g., headers, method) before the proxy request is issued
        proxyReqOpts.headers["content-type"] = "application/json";
        return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => { //A function (also supports Promises) to modify the proxy's response body before sending it back to the original client.
        logger.info(`Response received from Identity service: ${proxyRes.statusCode}`);

        return proxyResData;
    }
}))

//setting up proxy for our post service

app.use("/v1/posts", validateToken, proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["content-type"] = "application/json";
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

        return proxyReqOpts
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => { //A function (also supports Promises) to modify the proxy's response body before sending it back to the original client.
        logger.info(`Response received from Post service: ${proxyRes.statusCode}`);

        return proxyResData;
    }
}));

//setting up proxy for our search service

app.use("/v1/search", validateToken, proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["content-type"] = "application/json";
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

        return proxyReqOpts
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => { //A function (also supports Promises) to modify the proxy's response body before sending it back to the original client.
        logger.info(`Response received from Search service: ${proxyRes.statusCode}`);

        return proxyResData;
    }
}));

app.use(errorHandler);

app.listen(port, () => {
    logger.info("Api Gateway is running on port " + port);
    logger.info("Identity Service is running on port " + process.env.IDENTITY_SERVICE_URL);
    logger.info("Post Service is running on port " + process.env.POST_SERVICE_URL);
    logger.info("Media Service is running on port " + process.env.MEDIA_SERVICE_URL);
    logger.info("Search Service is running on port " + process.env.SEARCH_SERVICE_URL);
    logger.info(`Redis url ${process.env.REDIS_URL}`);
})

//setting up proxy for our media service (uploading img, videos, etc)

app.use("/v1/media", validateToken, proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

        if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
            proxyReqOpts.headers["content-type"] = "application/json";
        }

        return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => { //A function (also supports Promises) to modify the proxy's response body before sending it back to the original client.
        logger.info(`Response received from Media service: ${proxyRes.statusCode}`);

        return proxyResData;
    },
    parseReqBody: false
}
));