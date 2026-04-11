import express from 'express';
import { getMessages, sendMessage, getunread, markread, getGroupMessages, sendGroupMessage } from '../controllers/message.js';
const router = express.Router();
import { checkauth } from "../middlewares/checkauth.js"

router.get("/get/:id", checkauth, getMessages)
router.get('/group/:groupId', checkauth, getGroupMessages)
router.get("/getunread/:id", checkauth, getunread)
router.get("/markread/:id", checkauth, markread)
router.post("/send", checkauth, sendMessage)
router.post('/group/send', checkauth, sendGroupMessage)



export default router;
