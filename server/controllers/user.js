const user = require('../models/user');
const { generateToken } = require('../services/authentication');
const bcrypt = require('bcrypt');
const cloudinary = require('../services/cloudinary');


async function registerUser(req, res) {

    const { name, email, password, username } = req.body;
    try {

        if (!name || !email || !password || !username) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        const existingUser = await user.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const newUser = (await user.create({ name, email, password, username }));
        let userWithoutPassword = newUser.toObject()
        delete userWithoutPassword.password
        await generateToken(userWithoutPassword, res);
        res.json({
            success: true,
            message: "User registered successfully",
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

async function loginUser(req, res) {



    const { email, password } = req.body;
    try {

        const findeduser = await user.findOne({ $or: [{ email: email }, { username: email }] }).select('+password');;
        if (!findeduser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, findeduser.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }
        let userWithoutPassword = findeduser.toObject()
        delete userWithoutPassword.password
        await generateToken(findeduser, res);
     


        res.json({ success: true, message: "Login successful", user: userWithoutPassword })
    }
    catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function updateuser(req, res) {

    let profileImg;
    let name;
    let username;
    let bio;
    try {

        if (req.files) {

            const base64Image = `data:${req.files.image.mimetype};base64,${req.files.image.data.toString('base64')}`;
            const uploadResponse = await cloudinary.uploader.upload(base64Image, {
                resource_type: 'auto',
                folder: 'profile_pics',
                public_id: req.user._id,
            });
            profileImg = uploadResponse.secure_url;
            console.log(profileImg);
        }


        if (req.body.name) {
            name = req.body.name
        }
        if (req.body.username) {
            username = req.body.username
        }
        if (req.body.bio) {
            bio = req.body.bio
        }


        const updatedUser = await user.findByIdAndUpdate(req.user._id, { name, username, bio, profileImg }, { new: true });

        let userWithoutPassword = updatedUser.toObject()
        delete userWithoutPassword.password

        res.json({
            message: "User updated successfully",
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function logout(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });

}

async function check(req, res) {
    try {
        res.json({ success: true, message: "Authorization Successfull", user: req.user })

    } catch (error) {
        console.error("Error in check autorization controller:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        }
        )
    }
}

async function getusersforsidebar(req,res){
    try {
        const gettingusers = await user.find({ _id: { $ne: req.user._id } })
    
        res.json({success:true,users:gettingusers})
    } catch (error) {
        console.log(error);
        
    }
}


module.exports = {
    registerUser,
    loginUser,
    updateuser,
    check,
    logout,
    getusersforsidebar
};