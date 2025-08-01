const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
        select:false,
    },
    username: {
        type: String,
        required:true,
        unique: true,
        trim: true,
    },
    bio: {
        type: String,
        default:"Busy"
    },
    profileImg: {
        type: String,
        trim: true,
    },
   
}, {
    timestamps: true,
});


userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) { return next(); }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    }
    catch (err) {
        console.error(err);
    }
});


const User = mongoose.model('User', userSchema);

module.exports = User;

