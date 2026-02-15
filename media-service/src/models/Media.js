const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
    publicId : {
        type: String,
        requied: true,
    },
    originalName: {
        type: String,
        requied: true,
    },
    mimeType: {
        type: String,
        requied: true,
    },
    url:{
        type: String,
        requied: true,
    },
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},
{
    timestamps: true
})

const Media = mongoose.model("Media", mediaSchema);

module.exports = Media;