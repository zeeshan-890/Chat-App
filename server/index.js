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
      'https://chat-app-zeeshan-b25392777074.herokuapp.com' // Update with your actual Heroku URL
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

// API routes FIRST (before static files)
app.use('/api/user', userroute)
app.use('/api/message', msgroute)

// Serve static files with proper cache headers
app.use(express.static(path.join(__dirname, '../client/dist'), {
  maxAge: '1d',
  etag: false,
  setHeaders: (res, filePath, stat) => {
    // Set proper MIME types
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }

    // Add cache control
    if (filePath.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));


// Catch-all for React Router (MUST be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(port, () => console.log(`Server listening on port ${port}`))

// Attach PeerJS server after server.listen
// app.use('/myapp', peerServer);
