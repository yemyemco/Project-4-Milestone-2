//MongoDB
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
    { 
        firstName: {type: String, require: true},
        lastName: {type: String, require: true},
        email: {type: String, unique: true, require: true},
        pass: {type: String, require: true},
        role: {type: String, default: "student"}
    },
    {timestamps: true}
);

const userDB = new mongoose.model("userDB", userSchema);
module.exports = userDB;


