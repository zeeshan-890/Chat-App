import { config } from 'dotenv';
config();

import fileUpload from 'express-fileupload';
import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import { io, app, server } from "./services/socket.js";

import { fileURLToPath } from 'url';

import userroute from './routes/user.js';
import msgroute from './routes/message.js';
import { checkauth } from './middlewares/checkauth.js';
import cookieParser from 'cookie-parser';

mongoose.connect(process.env.Mongo_Url).then(() => {
  console.log('Connected to MongoDB')
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err)
})

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true })); // Allow frontend origin
app.use(express.json())
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }))
// app.use(cors({ origin: 'http://localhost:5173',credentials:true })); // Allow frontend origin

app.use(cookieParser())


app.use('/user', userroute)
app.use('/message', msgroute)



if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', 'dist', 'index.html'))
  })
}

server.listen(port, () => console.log(`Server listening on port ${port}`))

// Attach PeerJS server after server.listen
// app.use('/myapp', peerServer);
