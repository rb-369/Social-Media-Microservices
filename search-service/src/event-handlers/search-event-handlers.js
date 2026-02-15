const Search = require("../models/Search");
const logger = require("../utils/logger");


async function handlePostCreated(event) {

    try {

        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createdAt: event.createdAt
        })

        await newSearchPost.save();
        logger.info(`Search Post Created ${event.postId}, ${newSearchPost._id.toString()}`)


    } catch (e) {
        logger.error("Error handling post creation!", e);
    }
}

async function handlePostDeleted(event) {
    
    try{

        await Search.findOneAndDelete({postId: event.postId})

        logger.info(`Search Post Deleted ${event.postId}`)

    }catch(e){
        logger.error("Error handling post deletion!", e);
    }
}

module.exports = { handlePostCreated, handlePostDeleted };