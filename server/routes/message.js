const express = require('express');
const {getMessages,sendMessage,getunread,markread} = require('../controllers/message');
const router = express.Router();
const {checkauth} = require("../middlewares/checkauth")

router.get("/get/:id",checkauth,getMessages)
router.get("/getunread/:id",checkauth,getunread)
router.get("/markread/:id",checkauth,markread)
router.post("/send",checkauth,sendMessage)



module.exports = router;
