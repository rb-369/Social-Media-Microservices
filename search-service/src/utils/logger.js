
const winston = require("winston"); //A flexible logging library.
//Supports different log levels, transports (console, file, cloud), and formats.

const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(), //adding at which time message came
        winston.format.errors({stack: true}), // to show errors
        winston.format.splat(), //enables support for message templating
        winston.format.json() // converts msg into json format
    ),
    defaultMeta : {service: "search-service"},
    transports: [
        new winston.transports.Console({  // to get the logs in our console
            format: winston.format.combine(
                winston.format.colorize(), // for better readability
                winston.format.simple()
            )
            
        }),
        new winston.transports.File({filename: "error.log", level: "error"}), // for logging errors
        new winston.transports.File({filename: "combined.log"})
    ]
});

module.exports = logger;