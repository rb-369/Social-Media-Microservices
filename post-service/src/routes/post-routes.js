
const express = require("express");
const { createPost, getAllPosts, getPost, deletePost } = require("../controllers/post-controller");
const { authReq } = require("../middlewares/auth-middleware");

//here we will use middleware to tell if user is authenticated or not

const router = express.Router();

// router.use(authReq);

router.post("/create-post", createPost);
router.get("/all-posts", getAllPosts);
router.get("/:id", getPost);
router.delete("/del/:id", deletePost);
module.exports = router;