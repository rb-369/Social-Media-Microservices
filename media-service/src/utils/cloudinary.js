const logger = require("./logger");

const cloudinary = require("cloudinary").v2;

require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET

})

const uploadMediaToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            resource_type: "auto"
        },
            (error, result) => {
                if (error) {
                    logger.error("Error while uploading the media to the cloudinary", error)
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        )

        uploadStream.end(file.buffer);

    })
} 

const deleteMediaFromCloudinary = async (publicId) => {
    
    try{

        const result = await cloudinary.uploader.destroy(publicId);
        logger.info("Media Deleted Successfully!" , publicId);

        return result;

    }catch(e){
        logger.error("Error While deleting Media From Cloudinary", e);
        throw e;
    }
}

module.exports = {uploadMediaToCloudinary, deleteMediaFromCloudinary};