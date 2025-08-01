const {Server, Socket} = require("socket.io")
const http = require('http')
const express = require('express')

const app = express()
const server= http.createServer(app)
const io = new Server(server ,{cors:{origin:'http://localhost:5173',credentials:true }})

// Only keep this startup log
console.log("Socket.io server created with CORS origin: http://localhost:5173");

const usersocketmap = {}

io.on('connection',(socket)=>{
    // Only log connection event
    // console.log('connected successfully to socket ',socket.id);

    const userId = socket.handshake.query.userId
    // Only log userId if needed for debugging
    // console.log('user id :',userId);
    if(userId){
        usersocketmap[userId] = socket.id
        // console.log('User socket map updated:', usersocketmap);
    }

    io.emit('getonline', Object.keys(usersocketmap))

    // Test event handler
    socket.on('test-event', (data) => {
        // No log needed
        socket.emit('test-response', { message: 'Test response from server' });
    });

    socket.on('call-user', (data) => {
        // No log needed
        io.to(usersocketmap[data.to]).emit('incoming-call', {
            signal: data.signal,
            from: data.from,
            name: data.name,
            profileImg: data.profileImg // pass profile image too
        });
    });

    // Handle call rejection
    socket.on('call-rejected', (data) => {
        io.to(usersocketmap[data.to]).emit('call-rejected', {
            from: socket.id
        });
    });

    socket.on('answer-call', (data) => {
        // No log needed
        const callerSocketId = usersocketmap[data.to];
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-answered', {
                signal: data.signal,
                from: data.from
            });
        }
    });

    // Handle end call
    socket.on('end-call', (data) => {
        io.to(usersocketmap[data.to]).emit('end-call', {
            from: socket.id
        });
    });

    // Relay ICE candidates for WebRTC
    socket.on('ice-candidate', (data) => {
        io.to(usersocketmap[data.to]).emit('ice-candidate', {
            candidate: data.candidate,
            from: data.from
        });
    });

    socket.on('disconnect', ()=>{
        // Only log disconnect if needed
        delete usersocketmap[userId]
        io.emit('getonline', Object.keys(usersocketmap))
    })

})

function getreceiversocketid(userId){
    return usersocketmap[userId]
}

module.exports = {
    app,server,io,getreceiversocketid
}; 