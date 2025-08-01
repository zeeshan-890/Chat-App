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

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://your-heroku-app.herokuapp.com'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));
app.use(express.json())
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Serve assets first with proper MIME types
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Serve other static files from dist
app.use(express.static(path.join(__dirname, '../client/dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// API routes
app.use('/api/user', userroute)
app.use('/api/message', msgroute)

// Catch-all for React Router (must be LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});


server.listen(port, () => console.log(`Server listening on port ${port}`))

// Attach PeerJS server after server.listen
// app.use('/myapp', peerServer);
