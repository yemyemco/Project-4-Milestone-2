const jwt = require("jsonwebtoken");
const userdb = require("../userDB");
const config = process.env;

//Verify user's token   
const verifyToken = async (req, res, next)=>
{
    try {
    let getToken = req.headers["x-access-token"] || req.header("Authorisation") || req.body.token || req.query.token;

    if(!getToken)
    {
        return res.status(400).json({Message: "Token error: Log in again"});
    }
        
        //Verify token
        getToken = jwt.verify(getToken, config.ACCESS_TOKEN);

        return next();

    } catch (error) {
        if(error.message == "jwt expired")
        {
            return res.status(400).json({Message: "Session expired. Please log in again"});
        }
        else
        {
            return res.status(400).json({Message: "Encountered error: " + error.message});
        }
    }
}    

module.exports = verifyToken;
