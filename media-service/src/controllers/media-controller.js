const { log} = require("winston")
const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
    logger.info("Starting media upload")

    try{

        if(!req.file){
            logger.error("No file found! Please add a file and try again!");
            return res.status(200).json({
                message: "No file found! Please add a file and try again!",
                success: false
            })
        }

        const {originalname, mimeType, buffer, } = req.file

        const userId = req.user.userId;

        logger.info(`File Details: ${originalname}, type=${mimeType}`);

        logger.info("Uploading to cloudinary starting...");

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

        logger.info(`Cloudinary upload successfull. Public Id: - ${cloudinaryUploadResult.public_id}`)

        const newMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimeType,
            url: cloudinaryUploadResult.secure_url,
            userId: userId
        })

        await newMedia.save();

        res.status(201).json({
            success: true,
            message: "Media upload is successfull",
            mediaId: newMedia._id,
            url: newMedia.url,
        })

    }catch(e){
        logger.error("Error While uploading Media", e);

        res.status(500).json({
            success: false,
            message: "Error While uploading Media :( "
        })
    }
}

const getAllMedia = async (req,res) => {
    
    try{

        const result = await Media.find({});

        res.status(200).json({
            success: true,
            message: "Fetched Data Successfully! :)",
            data: result
        })

    }catch(e){
        logger.error("Error While Fetching Media", e);

        res.status(500).json({
            success: false,
            message: "Error While Fetching Media :("
        })
    }
}

module.exports = {uploadMedia, getAllMedia};