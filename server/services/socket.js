import { Server } from "socket.io";
import http from 'http';
import express from 'express';
import { PeerServer } from 'peer';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Use your actual client URL
        credentials: true
    }
});



// Only keep this startup log
console.log(`Socket.io server created with CORS origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);

const usersocketmap = {};

io.on('connection', (socket) => {
    // Only log connection event
    // console.log('connected successfully to socket ', socket.id);

    const userId = socket.handshake.query.userId;
    // Only log userId if needed for debugging
    // console.log('user id :', userId);
    if (userId) {
        usersocketmap[userId] = socket.id;
        // console.log('User socket map updated:', usersocketmap);
    }

    io.emit('getonline', Object.keys(usersocketmap));

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

    // ==========================================
    // DOCUMENT COLLABORATION EVENTS
    // ==========================================

    // Track which document rooms each socket is in
    const userDocumentRooms = new Set();

    // Join a document for collaboration
    socket.on('join-document', async ({ docId, user }) => {
        console.log(`User ${user?.name || userId} joining document ${docId}`);

        const roomName = `doc-${docId}`;
        socket.join(roomName);
        userDocumentRooms.add(docId);

        // Import dynamically to avoid circular dependency
        const { getDocumentState, addUserToDocument, getActiveUsers, generateRandomColor } = await import('./yjs-server.js');

        // Get current document state from database
        const docState = await getDocumentState(docId);

        if (docState) {
            // Send current state to the joining user
            socket.emit('document-state', {
                state: docState.state,
                docId
            });
        }

        // Track this user in the document
        const userColor = generateRandomColor();
        addUserToDocument(docId, socket.id, {
            _id: userId,
            name: user?.name || 'Anonymous',
            color: userColor
        });

        // Notify others that a user joined
        socket.to(roomName).emit('user-joined-document', {
            docId,
            userId: userId,
            name: user?.name || 'Anonymous',
            color: userColor
        });

        // Send list of active users to the joining user
        const activeUsers = getActiveUsers(docId);
        socket.emit('document-active-users', { docId, users: activeUsers });
    });

    // Receive and broadcast document updates
    socket.on('document-update', async ({ docId, update, userId: editorId }) => {
        const roomName = `doc-${docId}`;

        // Broadcast to all other users in the document
        socket.to(roomName).emit('document-update', {
            docId,
            update,
            from: editorId || userId
        });

        // Save to database (debounced)
        const { saveDocumentState } = await import('./yjs-server.js');
        saveDocumentState(docId, new Uint8Array(update), editorId || userId);
    });

    // Cursor position updates
    socket.on('cursor-update', ({ docId, cursor, user }) => {
        const roomName = `doc-${docId}`;
        socket.to(roomName).emit('cursor-update', {
            docId,
            cursor,
            userId: userId,
            userName: user?.name || 'Anonymous',
            userColor: user?.color
        });
    });

    // Selection updates
    socket.on('selection-update', ({ docId, selection, user }) => {
        const roomName = `doc-${docId}`;
        socket.to(roomName).emit('selection-update', {
            docId,
            selection,
            userId: userId,
            userName: user?.name || 'Anonymous',
            userColor: user?.color
        });
    });

    // Leave document
    socket.on('leave-document', async ({ docId }) => {
        console.log(`User ${userId} leaving document ${docId}`);

        const roomName = `doc-${docId}`;
        socket.leave(roomName);
        userDocumentRooms.delete(docId);

        const { removeUserFromDocument } = await import('./yjs-server.js');
        removeUserFromDocument(docId, socket.id);

        // Notify others
        socket.to(roomName).emit('user-left-document', {
            docId,
            userId: userId
        });
    });

    socket.on('disconnect', async () => {
        // Only log disconnect if needed
        delete usersocketmap[userId];
        io.emit('getonline', Object.keys(usersocketmap));

        // Clean up document rooms
        const { removeUserFromDocument } = await import('./yjs-server.js');
        for (const docId of userDocumentRooms) {
            removeUserFromDocument(docId, socket.id);
            io.to(`doc-${docId}`).emit('user-left-document', {
                docId,
                userId: userId
            });
        }
    });
});

function getreceiversocketid(userId) {
    return usersocketmap[userId];
}

export {
    app,
    server,
    io,
    getreceiversocketid
};