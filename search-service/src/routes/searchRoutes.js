const express = require("express");
const { searchPostController } = require("../controllers/search-controller");
const { authReq } = require("../middlewares/auth-middleware");

const router = express.Router();

router.use(authReq);

router.get("/posts", searchPostController);

module.exports = router;