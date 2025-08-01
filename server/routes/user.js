import express from 'express';
import { registerUser, loginUser, updateuser, check, logout, getusersforsidebar } from '../controllers/user.js';
const router = express.Router();
import { checkauth } from "../middlewares/checkauth.js"

router.post('/update', checkauth, updateuser)
router.post('/sign-up', registerUser)
router.post('/login', loginUser);
router.get('/logout', logout);
router.get("/check", checkauth, check)
router.get("/getusers", checkauth, getusersforsidebar)

export default router;