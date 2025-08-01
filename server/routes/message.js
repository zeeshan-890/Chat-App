import express from 'express';
import { getMessages, sendMessage, getunread, markread } from '../controllers/message.js';
const router = express.Router();
import { checkauth } from "../middlewares/checkauth.js"

router.get("/get/:id", checkauth, getMessages)
router.get("/getunread/:id", checkauth, getunread)
router.get("/markread/:id", checkauth, markread)
router.post("/send", checkauth, sendMessage)



export default router;
