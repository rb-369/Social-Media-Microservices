const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
        logger.warn("Access attempt without valid token");

        return res.status(401).json({
            message: "Authentication Required",
            success: false
        })
    }

    // jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    //     if (err) {
    //         logger.warn("Invalid token");

    //         return res.status(429).json({
    //             message: "Invalid token",
    //             success: false
    //         })
    //     }

    //     req.user = user;

    //     next();
    // })

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
            logger.warn("Token decoded but userId missing");
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

    req.user = { userId: decoded.userId };
    next();
}

module.exports = {validateToken};