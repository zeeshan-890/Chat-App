const{verifyToken} = require('../services/authentication');


async function checkauth(req,res,next ) {
  
    if(!req.cookies.token) { return res.status(403).json({success:false,message:"Unauthorized-No token"});}
   
    try {
        const user = await verifyToken(req.cookies.token);
        req.user = user;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(403).json({success:false,message:"Unauthorized-Invalid token"});
    }

}
module.exports = {
    checkauth
}