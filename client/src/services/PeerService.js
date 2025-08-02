import Peer from 'peerjs';

let peer = null;
let currentCall = null;

export function createPeer(id) {
    console.log('[PeerService] Creating Peer with id:', id);

    // Use window.location for production, localhost for dev
    const isProd = window.location.hostname !== 'localhost';
    peer = new Peer(id, {
        host: isProd ? window.location.hostname : 'localhost',
        port: isProd ? (window.location.port || 443) : 3000,
        path: '/peerjs',
        secure: isProd, // true for https, false for local dev
    });

    peer.on('open', (pid) => {
        console.log('[PeerService] PeerJS open with id:', pid);
    });
    peer.on('error', (err) => {
        console.error('[PeerService] PeerJS error:', err);
    });
    peer.on('disconnected', () => {
        console.warn('[PeerService] PeerJS disconnected');
    });
    peer.on('close', () => {
        console.warn('[PeerService] PeerJS closed');
    });
    return peer;
}

export function getPeer() {
    console.log('[PeerService] getPeer called:', peer);
    return peer;
}

export function callPeer(remoteId, stream, onStream, callerName, callerProfileImg) {
    const peer = getPeer();
    if (!peer) throw new Error('Peer not initialized');
    console.log('[PeerService] Calling remote peer:', remoteId, 'with stream:', stream);
    currentCall = peer.call(remoteId, stream, {
        metadata: {
            name: callerName,
            profileImg: callerProfileImg
        }
    });
    if (!currentCall) {
        console.error('PeerJS call() returned undefined');
        return;
    }
    currentCall.on('stream', (remoteStream) => {
        console.log('[PeerService] Received remote stream from callPeer:', remoteStream);
        onStream(remoteStream);
    });
    currentCall.on('close', () => {
        console.log('[PeerService] callPeer: Call closed');
    });
    currentCall.on('error', (err) => {
        console.error('[PeerService] callPeer: Call error:', err);
    });
    return currentCall;
}

export function answerCall(call, stream, onStream) {
    console.log('[PeerService] Answering call:', call, 'with stream:', stream);
    call.answer(stream);
    call.on('stream', (remoteStream) => {
        console.log('[PeerService] Received remote stream from answerCall:', remoteStream);
        onStream(remoteStream);
    });
    call.on('close', () => {
        console.log('[PeerService] answerCall: Call closed');
    });
    call.on('error', (err) => {
        console.error('[PeerService] answerCall: Call error:', err);
    });
    currentCall = call;
}

export function closeCall() {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
}