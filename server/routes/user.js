const express = require('express');
const { registerUser, loginUser,updateuser,check,logout ,getusersforsidebar} = require('../controllers/user');
const router = express.Router();
const {checkauth} = require("../middlewares/checkauth")








router.post('/update', checkauth,updateuser)
router.post('/sign-up', registerUser)
router.post('/login', loginUser);
router.get('/logout', logout);
router.get("/check",checkauth,check)
router.get("/getusers",checkauth,getusersforsidebar)



module.exports = router;