const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {

    const cachedKey = `post:${input}`;

    await req.redisClient.del(cachedKey);
    
    const keys = await req.redisClient.keys("posts:*");

    if(keys.length >0){
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info("Create Post endpoint hit")

    try {

        const { error } = validatePost(req.body);

        if (error) {
            logger.warn("Post Validation Error!", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { content, mediaIds } = req.body;

        const userId = req.headers["x-user-id"];

        const newPost = new Post({
            user: userId,
            content: content,
            mediaIds: mediaIds || []
        })

        await newPost.save();

        await publishEvent("post.created", {
            postId: newPost._id.toString(),
            userId : newPost.user.toString(),
            content : newPost.content,
            createdAt : newPost.createdAt
        })

        await invalidatePostCache(req, newPost._id.toString());

        logger.info("Post created Successfully! ");

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            post: newPost
        });

    } catch (e) {
        logger.error("Error While creating a new Post", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

const getAllPosts = async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = parseInt(req.query.limit) || 10;

        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`

        const cachedPosts = await req.redisClient.get(cacheKey);

        if (cachedPosts) {
            // logger.info(cacheKey, cachedPosts)
            return res.json(JSON.parse(cachedPosts))
        }

        const posts = await Post.find({}).sort({ createdAt: -1 }).skip(startIndex).limit(limit);

        const totalPosts = await Post.countDocuments();

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts: totalPosts
        }

        //save your posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result))

        return res.status(200).json({
            message: `Got total ${posts.length} Posts`,
            success: true,
            result
        })

    } catch (e) {
        logger.error("Error While getting Posts", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

const getPost = async (req, res) => {

    try {

        const postId = req.params.id;

        const cacheKey = `posts:${postId}`;
        const cachedPost = await req.redisClient.get(cacheKey);
        if(cachedPost){
            logger.info(cacheKey, JSON.parse(cachedPost))
            return res.json(JSON.parse(cachedPost))
        }

        const singlePost = await Post.findById(postId);

        if(!singlePost){
            return res.status(404).json({
                message: "Post Not Found! :(",
                success: false
            })
        }

        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(singlePost));
        
        res.json(singlePost);

    } catch (e) {
        logger.error("Error While getting a Post", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

const deletePost = async (req, res) => {

    try {

        const postId = req.params.id;

        const delPost = await Post.findOneAndDelete({
            _id: postId,
            user: req.headers["x-user-id"]
        })

        if(!delPost){
            return res.status(404).json({
                message: "Post Not Found! :(",
                success: false
            })
        }

        //publish post delete method (so that if a post is deleted then the media related to that post is also deleted
        // for eg. u created a post with some of your photos with some caption now if u delete that post then the photos(i.e media) should also be deleted along with the caption)

        await publishEvent("post.delete", {
            postId: delPost._id.toString(),
            userId: req.headers["x-user-id"],
            mediaIds: delPost.mediaIds
        })

        await invalidatePostCache(req, postId);

        res.json({
            message: "Post Deleted Successfully",
            data: delPost
        })
    } catch (e) {
        logger.error("Error While deleting a Post", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

module.exports = { createPost, getAllPosts, getPost, deletePost }