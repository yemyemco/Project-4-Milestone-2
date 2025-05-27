const mongoose = require("mongoose");
const enrollmentSchema = new mongoose.Schema({
    matricNo: {type: String, require: true},
    firstName: {type: String, require: true}, 
    lastName: {type: String, require: true},
    level: {type: Number, require: true},
    email: {type: String, require: true},
    course_code: {type: String, require: true},
    course_title: {type: String, require: true},
    course_unit: {type: String, require: true},
    course_semester: {type: String, require: true}
},
{timestamps: true}
);

const enrollDB = new mongoose.model("enrollDB", enrollmentSchema);
module.exports = enrollDB;
