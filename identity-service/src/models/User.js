const mongoose = require("mongoose");

const argon2 = require("argon2"); //A modern password hashing algorithm.  
// More secure than older ones like bcrypt. Used for storing user passwords safely.

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now()
        }
    },
    {
        timestamps: true
    }
);
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {

        try {
            this.password = await argon2.hash(this.password)
        } catch (e) {
            console.log(e);
            return next(e)
        }
    }
})

userSchema.methods.comparePassword = async function (getPassword) {

    try {

        return await argon2.verify(this.password, getPassword)

    } catch (e) {
        throw e
    }
}

userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);

module.exports = User;