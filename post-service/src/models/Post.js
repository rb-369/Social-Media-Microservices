const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true,
    },
    likes:{
        type: Number,
        default: 0
    },
    comments:{
        type: String,
        default: 0
    },
    mediaIds: [
        {
            type: String
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now()
    }
},
    {
        timestamps: true
    }
)

postSchema.index({content: "text"});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;