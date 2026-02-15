
const RefreshToken = require("../models/refreshToken");
const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
//we need
//1)User registration

const registerUser = async (req, res) => {

    logger.info("Registration endpoint hit...");

    try {

        // validate the schema
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn("Validation Error!", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password, username } = req.body;

        let user = await User.findOne({ $or: [{ email }, { username }] })
        if (user) {
            logger.warn("User already exists with same email or username :(");
            return res.status(400).json({
                success: false,
                message: "User already exists with same email or username :("
            })
        }

        user = new User({ username, email, password });
        await user.save();

        logger.warn("User saved successfully! :)", user._id);

        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: "User registered sucsessfully! :)",
            accessToken,
            refreshToken
        })

    } catch (e) {
        logger.error("Registration Error ", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

//2)User login
const loginUser = async (req, res) => {
    logger.info("Login endpoint hit");

    try {
        const { error } = validateLogin(req.body);

        if (error) {
            logger.warn("Validation Error!", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password, username } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            logger.warn("Invalid user");
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        //validate password

        const isValid = await user.comparePassword(password);

        if(!isValid){
            logger.warn("Invalid Password");
            return res.status(400).json({
                success: false,
                message: "Invalid Password"
            })
        }

        const {accessToken, refreshToken} =await generateTokens(user);

        res.status(200).json({
            success: true,
            message: "Login Successful",
            accessToken: accessToken,
            refreshToken: refreshToken,
            userId: user._id
        })

    } catch (e) {
        logger.error("Error While Login", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

//3)refresh token
const refreshTokenController = async (req,res) => {
    
    logger.info("Refresh Token endpoint hit...");

    try{

        const {refreshToken} = req.body;
        
        if(!refreshToken){
            logger.warn("Refresh Token is missing! ");
            return res.status(400).json({
                success: false,
                message: "Refresh Token is missing!"
            })
        }

        const storedToken = await RefreshToken.findOne({token: refreshToken});

        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn("Invalid or Expired Token! :(");

            return res.status(401).json({
                success: false,
                message: "Invalid or Expired Token! :("
            })
        }

        const user = await User.findById(storedToken.user);

        if(!user){
            logger.warn("User not found! :(");

            return res.status(401).json({
                success: false,
                message: "User not found! :("
            })
        }

        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateTokens(user);

        // delete the old refresh token
        await RefreshToken.deleteOne({_id: storedToken._id});

        res.status(200).json({
            success: true,
            message: "New refresh token created Successful",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            userId: user._id
        })

    }catch(e){
        logger.error("Error While getting refresh token", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

//4)Logout

const logoutUser = async (req,res) => {
    
    logger.info("Logut endpoint hit");

    try{

        const {refreshToken} = req.body;

        if(!refreshToken){
            logger.warn("Refresh Token is missing! ");
            return res.status(400).json({
                success: false,
                message: "Refresh Token is missing!"
            })
        }

        await RefreshToken.deleteOne({token: refreshToken});

        logger.info("Refrsh Token deleted for logout");

        res.status(200).json({
            success: true,
            message: "Logged out successfully!"
        })

    }catch(e){
        logger.error("Error While Logging out", e);

        res.status(500).json({
            success: false,
            message: "Internal Server Error! "
        })
    }
}

module.exports = { registerUser, loginUser, refreshTokenController, logoutUser };