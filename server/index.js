require('dotenv').config();
const fileUpload = require('express-fileupload');
const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const cors = require('cors');
const { io, app, server } = require("./services/socket")
const { ExpressPeerServer } = require('peer');

const userroute = require('./routes/user')
const msgroute = require('./routes/message')
const { checkauth } = require('./middlewares/checkauth')
const cookieParser = require('cookie-parser')

mongoose.connect(process.env.Mongo_Url).then(() => {
  console.log('Connected to MongoDB')
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err)
})

const __dirname = path.resolve();


const port = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true })); // Allow frontend origin
app.use(express.json())
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }))
// app.use(cors({ origin: 'http://localhost:5173',credentials:true })); // Allow frontend origin

app.use(cookieParser())

// // Attach PeerJS server to your existing HTTP server
// const peerServer = ExpressPeerServer(server, {
//   path: '/myapp',
//   debug: true,
// });

app.use('/user', userroute)
app.use('/message', msgroute)

// Attach PeerJS server LAST to avoid conflicts
// app.use('/myapp', peerServer);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', 'dist', 'index.html'))
  })
}

server.listen(port, () => console.log(`Server listening on port ${port}`))

// Attach PeerJS server after server.listen
// app.use('/myapp', peerServer);
