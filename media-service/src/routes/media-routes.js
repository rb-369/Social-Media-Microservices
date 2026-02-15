const express = require("express");
const multer = require("multer");
const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const { authReq } = require("../middlewares/auth-middleware");
const logger = require("../utils/logger");

const router = express.Router();

//configure multer for file upload

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5*1024*1024 //5 MB max size
    }
}).single("file")

router.post("/upload", authReq, (req, res, next)=>{
    upload(req, res, function(err){
        if(err instanceof multer.MulterError){
            logger.error("Multer error while uploading", err)
            res.status(400).json({
                success: false,
                message: "Multer error while uploading",
                error: err.message,
                stack: err.stack
            })
        } else if(err){
            logger.error("Unkown error while uploading", err)
            res.status(500).json({
                success: false,
                message: "Unkownr error while uploading",
                error: err.message,
                stack: err.stack
            })
        }

        if(!req.file){
            res.status(400).json({
                success: false,
                message: "No file found"
            })
        }

        next();
    })
}, uploadMedia);

router.get("/getall", authReq, getAllMedia);

module.exports=router;