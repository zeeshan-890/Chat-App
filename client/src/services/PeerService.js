import Peer from 'peerjs';

let peer = null;
let currentCall = null;
let currentPeerId = null;

const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
];

function normalizePath(pathValue) {
    if (!pathValue) {
        return '/peerjs';
    }

    const withLeadingSlash = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
    return withLeadingSlash.replace(/\/$/, '');
}

function resolvePeerOptions() {
    const peerUrlFromEnv = (import.meta.env.VITE_PEER_URL || '').trim();
    const peerPathFromEnv = normalizePath((import.meta.env.VITE_PEER_PATH || '/peerjs').trim());

    if (peerUrlFromEnv) {
        const parsedUrl = new URL(peerUrlFromEnv);
        return {
            host: parsedUrl.hostname,
            port: parsedUrl.port
                ? Number(parsedUrl.port)
                : (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname && parsedUrl.pathname !== '/'
                ? normalizePath(parsedUrl.pathname)
                : peerPathFromEnv,
            secure: parsedUrl.protocol === 'https:',
        };
    }

    const isProd = window.location.hostname !== 'localhost';
    return {
        host: isProd ? window.location.hostname : 'localhost',
        port: isProd
            ? (window.location.port ? Number(window.location.port) : 443)
            : 3000,
        path: peerPathFromEnv,
        secure: isProd,
    };
}

export function createPeer(id) {
    console.log('[PeerService] Creating Peer with id:', id);

    if (peer && !peer.destroyed) {
        if (peer.id === id && peer.open && !peer.disconnected) {
            return peer;
        }

        try {
            peer.destroy();
        } catch {
            // ignore destroy failures during peer re-init
        }
        peer = null;
    }

    const peerOptions = resolvePeerOptions();
    currentPeerId = id;

    peer = new Peer(id, {
        host: peerOptions.host,
        port: peerOptions.port,
        path: peerOptions.path,
        secure: peerOptions.secure,
        debug: 1,
        config: {
            iceServers: DEFAULT_ICE_SERVERS,
        }
    });

    console.log('[PeerService] Peer created:', peer);

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

export function destroyPeer() {
    if (peer && !peer.destroyed) {
        peer.destroy();
    }
    currentPeerId = null;
    peer = null;
}

export function callPeer(remoteId, stream, onStream, callerName, callerProfileImg) {
    const peer = getPeer();
    if (!peer || peer.destroyed) throw new Error('Peer not initialized');
    if (peer.disconnected) {
        throw new Error('Peer disconnected. Reconnecting...');
    }
    if (!peer.open) throw new Error('Peer is not ready yet');
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