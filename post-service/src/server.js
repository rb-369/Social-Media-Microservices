require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ } = require("./utils/rabbitmq");

const app = express();

const port = process.env.PORT;

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

// pass redis client to routes
app.use("/api/posts", (req, res, next) => {
    req.redisClient = redisClient;

    next();
}, postRoutes)

app.use("/api/posts", postRoutes);


app.use(errorHandler);

async function startServer() {

    try {
        await connectToRabbitMQ();
        app.listen(port, () => {
            console.log(`Server is Running on port ${port}`);
            logger.info(`Post Service is Running on port ${port} :)`);
        })
    } catch (e) {
        logger.error("Error while Starting the server. Failed To Connect to the Server :(", e);
        process.exit(1);
    }
}

startServer();


