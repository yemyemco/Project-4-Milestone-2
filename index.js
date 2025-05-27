const dotenv = require("dotenv").config();
const express = require("express"); //Instantiate express
const server = express();   //Create server variable
server.use(express.json());    //Use json for handling files
const PORT = process.env.PORT;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("./middleware/auth");

//MongoDB
const mongoose = require("mongoose");
const userdb = require("./userDB");
const coursedb = require("./courseDB");
const enrollDB = require("./enrollmentDB");
const db_URL = process.env.DB_URL;

//Connect to mongoDB
mongoose.connect(db_URL).then(()=>
console.log("Database connected successfully")
);

//Project Milestone 1
//API for sign up
server.post("/sign-up", async (req, res)=>
{
    //Check whether user alread exists
    try
    {
        const {firstName, lastName, email, pass} = req.body;      //Get user's details
        //Ensure all fields have been filled
        if (!firstName || !lastName || !email || !pass) 
            {
                return res.status(400).json({Message: "All fields are required"});
            }
        
        //Check whether user already exists
        const foundUser = await userdb.findOne({email});
        if(foundUser)
        {
            return res.status(403).json({Message: "Forbidden! The user ID provided already exists"});
        }
        
        //Encrypt (hash) password
        const encryptedpassword = await bcrypt.hash(pass, 12);

        //Create token for the new user
        const token = jwt.sign({
            email},
            process.env.ACCESS_TOKEN,
            {expiresIn: "1h"});

        const user = await new userdb({firstName, lastName, email: email.toLowerCase(), pass: encryptedpassword, token: token}); 
        await user.save();  //Save new user's details
            
            //Return the new user
             res.status(201).json(
                {Message: "Success! " + user.firstName + ", your account has been created" + user});
    }
    catch(error)
    {
        console.log("Error encountered: ", error.message);
    }
});

//API for signing in
server.post("/sign-in", async (req, res)=>
{
    try
    {
        const {email, pass} = req.body;
        if(!email || !pass)
        {
            return res.status(400).json({Message: "All fields required"});
        }
        const user = await userdb.findOne({email});
        if(!user)
        {
            return res.status(404).json({Message: "User does not exist. Create an account"});
        }
        
        const foundUser = await userdb.findOne({email});
        if(foundUser)
        {
            const passwordMatch = await bcrypt.compare(pass, user?.pass);
            if(passwordMatch)
                {
                    //Generate access and refresh tokens for user
                    const accessToken = await jwt.sign(
                    {email: foundUser?.email}, 
                    process.env.ACCESS_TOKEN,
                    {expiresIn: "1h"});

                    const refreshToken = await jwt.sign(
                    {email: foundUser?.email}, 
                    process.env.REFRESH_TOKEN,
                    {expiresIn: "2h"});

                    res.status(200).json({Message: "Success! Welcome " + foundUser.firstName,
                        AccessToken: accessToken
                    });
                }
                else
                {
                    res.status(400).json({Message: "Action failed! Invalid username or password"});
                }
        }
    }
    catch(error)
    {
        return res.status(400).json({Message: "Error encountered: " + error.message});
    }
});

//API for creating or adding courses
server.post("/addCourse", verifyToken, async (req, res)=>
{
    try {
        //Check input
        const {email, code, title, unit, semester} = req.body;
        
        if (!email || !code || !title || !unit || !semester)
        {
            return res.status(400).json({Message: "Error! All fields required"});
        }
        
        //Check user's role
        const user = await userdb.findOne({email});
        
        if(!user)
        {
            return res.status(400).json({Message: "Error: Wrong user"});
        }
        
        if (user.role != "instructor")
        {
            return res.status(400).json({Message: "Error: Unauthorised operation"});
        }

        //Check if course already exists
        const findCourse = await coursedb.findOne({code});
        if (findCourse)
        {
            return res.status(403).json({Message: "Forbidden! " + code + " already exists"});
        }

        //Save course to database
        const course = new coursedb({code, title, unit, semester});
        await course.save();
        res.status(201).json({Message: "Success! " + course.code + " has been created."});
    } catch (error) {
        return res.status(400).json({Message: "Oops! Something went wrong" + error.message});
    }
});

//Project Milestone 2
//API for viewing all available courses
server.get("/get-all-courses", async (req, res)=>
{
    const allCourses = await coursedb.find({}, {code: 1, title: 1, unit: 1, semester: 1, _id: 0});
    if(!allCourses)
    {
        return res.status(404).json({Message: "Sorry! No course found"});
    }
    return res.status(200).json({allCourses}
    );
});

//API for enrolling students
server.post("/enroll-student", async (req, res)=>
{
    try {
        const {matricNo, firstName, lastName, level, email, course_code} = req.body;

        //Verify input
        if(!matricNo || !firstName || !lastName || !level || !email || !course_code)
        {
            return res.status(400).json({Message: "All required fields must be filled"});
        }

        //Check whether student already exists
        const studentExist = await enrollDB.findOne({matricNo});
        if(studentExist)
        {
            return res.status(403).json({Message: "Forbidden! Student already enrolled"});
        }

        //Check availability of course being enrolled for
        const findCourse = await coursedb.findOne({code: course_code});
        if(!findCourse)
        {
            return res.status(404).json({Message: "Error! " + course_code + " not available for enrollment. Check available courses first."});
        }

        //Save student's data
        const studentData = await new enrollDB({matricNo, firstName, lastName, level, email,
            course_code: findCourse.code,
            course_title: findCourse.title,
            course_unit: findCourse.unit,
            course_semester: findCourse.semester
        });

        await studentData.save();

        return res.status(201).json({
            Message: "Student enrolled successfully",
            Matric: studentData.matricNo,
            FirstName: studentData.firstName,
            LastName: studentData.lastName,
            Course: studentData.course_code,
            Title: studentData.course_title,
            Unit: studentData.course_unit,
            Semester: studentData.course_semester
    })

    } catch (error) {
        return res.status(400).json({Message: "Something went wrong: " + error.message});
    } 
});

//API for view all enrolled students
server.get("/view-enrolled-students", async (req, res)=>
{
    try {
        const allStudents = await enrollDB.find();

    if(!allStudents)
    {
        return res.status(404).json({Message: "No student found."});
    }

    return res.status(200).json({
        allStudents
    });
    } catch (error) {
        return res.status(400).json({Message: "Something went wrong: " + error.message});
    }
});

//API for viewing one enrolled student by course
server.post("/view-students-by-course", async (req, res)=>
{
    try {
        const {course} = req.body;

        if(!course)
        {
            return res.status(400).json({Message: "Please specify a course to view students enrolled"});
        }

        const getCourse = await coursedb.findOne({code: course});
        if(!getCourse)
        {
            return res.status(404).json({Message: course + " is not available"})
        }

        const studentsByCourse = await enrollDB.findOne({course_code: course});

    if(!studentsByCourse)
    {
        return res.status(404).json({Message: "No student enrolled for " + course});
    }

    return res.status(200).json({
        Matric: studentsByCourse.matricNo,
        Name: studentsByCourse.firstName + " " + studentsByCourse.lastName,
        Level: studentsByCourse.level,
        Email: studentsByCourse.email,
        Course: studentsByCourse.course_code + ": " + studentsByCourse.course_title
    });
    
    } catch (error) {
        return res.status(400).json({Message: "Something went wrong: " + error.message});
    }
});

//Start the server
server.listen(PORT, ()=>
{
    console.log("Server started at " + PORT + "...");
})
