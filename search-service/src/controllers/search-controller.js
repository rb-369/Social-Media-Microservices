const Search = require("../models/Search");
const logger = require("../utils/logger")

async function invalidatePostCache(req, input) {

    const cachedKey = `search:${input}`;

    await req.redisClient.del(cachedKey);
    
    const keys = await req.redisClient.keys("search:*");

    if(keys.length >0){
        await req.redisClient.del(...keys);
    }
}
//implement caching here

const searchPostController = async (req, res) => {
    logger.info("Search endpoint hit");

    try {

        const { query } = req.query;

         const page = parseInt(req.query.page) || 1;

        const limit = parseInt(req.query.limit) || 10;

        const startIndex = (page - 1) * limit;

        const cacheKey = `search:${query}:${page}:${limit}`

        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.status(200).json({
                success: true,
                message: "Fetched From Cache",
                data: JSON.parse(cachedPosts)
            })
        }

        const results = await Search.find({
            $text: { $search: query }
        },
            {
                score: { $meta: "textScore" }
            }
        ).sort({ score: { $meta: "textScore" } }).skip(startIndex).limit(limit);

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));

        return res.status(200).json({
            success: true,
            message: "Fetched From Database",
            data: results
        })

    } catch (e) {
        logger.error("Error While searching a Post", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error While Searching Post! :("
        })
    }
}

module.exports = { searchPostController };