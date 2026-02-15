const logger = require("../utils/logger");

const authReq = (req, res, next) => {
    const userId = req.headers["x-user-id"];

    if(!userId){
        logger.warn("Access attempted without user id");

        return res.status(401).json({
            success: false,
            message: "Auth requires! Please Login to continue"
        })
    }

    req.user = {userId};

    next();
}

module.exports = {authReq};