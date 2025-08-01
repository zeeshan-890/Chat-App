import jwt from 'jsonwebtoken';
import user from '../models/user.js';

const key = process.env.JWT_SECRET || '12345'; // Use environment variable

async function generateToken(userObj, res) {
    try {
        const token = jwt.sign(
            { _id: userObj._id },
            key,
            { expiresIn: '30d' } // Add expiration
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
    } catch (error) {
        console.error("Error generating token:", error);
        throw new Error("Token generation failed");
    }
}

async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, key);
        const findeduser = await user.findById(decoded._id);
        return findeduser;
    } catch (error) {
        console.error("Error verifying token:", error);
        throw new Error("Token verification failed");
    }
}

export {
    generateToken,
    verifyToken
};