/**
 * WebRTC Service - Handles all WebRTC connection logic
 */

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.ideasip.com' },
  { urls: 'stun:stun.rixtelecom.se' },
  { urls: 'stun:stun.schlund.de' },
  { urls: 'stun:stunprotocol.org:3478' },
  { urls: 'stun:stun.voiparound.com' },
  { urls: 'stun:stun.voipbuster.com' },
  { urls: 'stun:stun.voipstunt.com' },
  { urls: 'stun:stun.voxgratia.org' },
  // ...add more as needed, following the same pattern
];


// const TURN_SERVERS = [
// //   {
// //     urls: 'turn:openrelay.metered.ca:80',
// //     username: 'openrelayproject',
// //     credential: 'openrelayproject'
// //   },
// //   {
// //     urls: 'turn:openrelay.metered.ca:443',
// //     username: 'openrelayproject',
// //     credential: 'openrelayproject'
// //   }


// {
//     url: 'turn:numb.viagenie.ca',
//     credential: 'muazkh',
//     username: 'webrtc@live.com'
// },
// {
//     url: 'turn:192.158.29.39:3478?transport=udp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
// },
// {
//     url: 'turn:192.158.29.39:3478?transport=tcp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
// },
// {
//     url: 'turn:turn.bistri.com:80',
//     credential: 'homeo',
//     username: 'homeo'
//  },
//  {
//     url: 'turn:turn.anyfirewall.com:443?transport=tcp',
//     credential: 'webrtc',
//     username: 'webrtc'
// }
// ];

// Helper to detect mobile devices
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.socket = null;
    this.remoteUser = null;
    this.localUser = null;
    this.isCaller = false;
    this.onTrackCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  initialize(socket, localUser, remoteUser, isCaller) {
    this.socket = socket;
    this.localUser = localUser;
    this.remoteUser = remoteUser;
    this.isCaller = isCaller;
    this.retryCount = 0;
    
    // Create a new peer connection with enhanced config
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        ...STUN_SERVERS,
        // ...TURN_SERVERS
      ],
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan',
      // Mobile optimizations
      iceTransportPolicy: isMobile() ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    
    // Set up event handlers
    this.setupPeerConnectionHandlers();
    
    console.log(`WebRTC service initialized as ${isCaller ? 'caller' : 'callee'}`);
    return this.peerConnection;
  }
  
  setupPeerConnectionHandlers() {
    const pc = this.peerConnection;
    
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      
      const candidateType = event.candidate.candidate.split(' ')[7] || 'unknown';
      console.log(`[WebRTC] Local ICE candidate: ${event.candidate.candidate.split(' ')[0]} (${candidateType})`);
      
      // Send the ICE candidate to the remote peer
      this.socket.emit('ice-candidate', {
        to: this.remoteUser._id,
        from: this.localUser._id,
        candidate: event.candidate
      });
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state: ${pc.iceConnectionState}`);
      
      // Attempt to recover from failed connections
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] Attempting to restart ICE connection');
        this.retryConnection();
      }
      
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(pc.iceConnectionState);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state: ${pc.connectionState}`);
      
      // Additional connection state handling
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] Connection established successfully!');
        this.retryCount = 0; // Reset retry count on successful connection
      }
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] Signaling state: ${pc.signalingState}`);
    };
    
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received: ${event.track.kind}`);
      this.remoteStream = event.streams[0];
      
      if (this.onTrackCallback) {
        this.onTrackCallback(event.streams[0]);
      }
    };
    
    // Add additional event handlers for debugging
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state: ${pc.iceGatheringState}`);
    };
    
    pc.onicecandidateerror = (event) => {
      console.error('[WebRTC] ICE candidate error:', event);
    };
  }
  
  retryConnection() {
    if (this.retryCount >= this.maxRetries) {
      console.error('[WebRTC] Max retry attempts reached');
      return;
    }
    
    this.retryCount++;
    console.log(`[WebRTC] Retrying connection (attempt ${this.retryCount}/${this.maxRetries})`);
    
    try {
      // Restart ICE gathering
      this.peerConnection.restartIce();
      
      // If we're the caller, create a new offer
      if (this.isCaller) {
        this.createAndSendOffer()
          .catch(error => console.error('[WebRTC] Error creating new offer during retry:', error));
      }
    } catch (error) {
      console.error('[WebRTC] Error during connection retry:', error);
    }
  }
  
  async getUserMedia() {
    try {
      // Different constraints for mobile vs desktop
      const constraints = isMobile() 
        ? {
            // Mobile constraints (simpler)
            audio: true,
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          }
        : {
            // Desktop constraints (higher quality)
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 }
            }
          };
      
      console.log(`[WebRTC] Getting user media with constraints for ${isMobile() ? 'mobile' : 'desktop'}`);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Error getting user media:', error);
      
      // Try bare minimum constraints as fallback
      try {
        console.log('[WebRTC] Trying fallback constraints');
        const fallbackConstraints = {
          audio: true,
          video: true
        };
        
        this.localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        return this.localStream;
      } catch (fallbackError) {
        console.error('[WebRTC] Error getting fallback media:', fallbackError);
        throw new Error('Could not access camera/microphone');
      }
    }
  }
  
  addLocalStreamTracks() {
    if (!this.localStream || !this.peerConnection) return;
    
    // Get current senders
    const senders = this.peerConnection.getSenders();
    const currentTracks = senders.map(sender => sender.track);
    
    // Add only tracks that aren't already added
    this.localStream.getTracks().forEach(track => {
      if (!currentTracks.find(t => t && t.id === track.id)) {
        console.log(`[WebRTC] Adding local ${track.kind} track`);
        this.peerConnection.addTrack(track, this.localStream);
      }
    });
  }
  
  async createAndSendOffer() {
    if (!this.peerConnection) return;
    
    try {
      // Create offer with specific options
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true,
        iceRestart: this.retryCount > 0 // Use ice restart for retries
      };
      
      console.log('[WebRTC] Creating offer with options:', offerOptions);
      const offer = await this.peerConnection.createOffer(offerOptions);
      
      // Modify SDP for better compatibility if needed
      // offer.sdp = this.modifySdp(offer.sdp);
      
      console.log('[WebRTC] Setting local description (offer)');
      await this.peerConnection.setLocalDescription(offer);
      
      // Send the offer to the remote peer
      this.socket.emit('call-user', {
        to: this.remoteUser._id,
        from: this.localUser._id,
        name: this.localUser.name,
        profileImg: this.localUser.profileImg || '',
        signal: offer
      });
      
      return offer;
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
      throw error;
    }
  }
  
  async handleRemoteOffer(offer) {
    if (!this.peerConnection) return;
    
    try {
      console.log('[WebRTC] Setting remote description (offer)');
      
      // Modify SDP for better compatibility if needed
      // offer.sdp = this.modifySdp(offer.sdp);
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any queued ICE candidates
      await this.processIceCandidateQueue();
      
      // Create answer
      console.log('[WebRTC] Creating answer');
      const answer = await this.peerConnection.createAnswer({
        voiceActivityDetection: true
      });
      
      // Modify SDP for better compatibility if needed
      // answer.sdp = this.modifySdp(answer.sdp);
      
      console.log('[WebRTC] Setting local description (answer)');
      await this.peerConnection.setLocalDescription(answer);
      
      // Send the answer to the remote peer
      this.socket.emit('answer-call', {
        to: this.remoteUser._id,
        from: this.localUser._id,
        signal: answer
      });
      
      return answer;
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error);
      throw error;
    }
  }
  
  async handleRemoteAnswer(answer) {
    if (!this.peerConnection) return;
    
    try {
      console.log('[WebRTC] Setting remote description (answer)');
      
      // Modify SDP for better compatibility if needed
      // answer.sdp = this.modifySdp(answer.sdp);
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Process any queued ICE candidates
      await this.processIceCandidateQueue();
      
      console.log('[WebRTC] Remote description set successfully');
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error);
      throw error;
    }
  }
  
  async handleRemoteIceCandidate(candidate) {
    if (!this.peerConnection) return;
    
    try {
      // If remote description is set, add candidate directly
      if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        console.log('[WebRTC] Adding ICE candidate directly');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Otherwise queue the candidate for later
        console.log('[WebRTC] Queueing ICE candidate for later processing');
        this.iceCandidateQueue.push(candidate);
      }
    } catch (error) {
      console.error('[WebRTC] Error handling ICE candidate:', error);
    }
  }
  
  async processIceCandidateQueue() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      console.log('[WebRTC] Cannot process ICE candidates yet - no remote description');
      return;
    }
    
    console.log(`[WebRTC] Processing ${this.iceCandidateQueue.length} queued ICE candidates`);
    
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] Added queued ICE candidate successfully');
      } catch (error) {
        console.error('[WebRTC] Error adding queued ICE candidate:', error);
      }
    }
  }
  
  // Optional: SDP modifier for compatibility
  modifySdp(sdp) {
    // Example modifications for better compatibility
    // - Force H.264 for video
    // - Set specific audio codecs
    // - Adjust bandwidth parameters
    
    // Just returning original SDP for now
    return sdp;
  }
  
  onTrack(callback) {
    this.onTrackCallback = callback;
    
    // If we already have a remote stream, call the callback immediately
    if (this.remoteStream) {
      callback(this.remoteStream);
    }
  }
  
  onConnectionStateChange(callback) {
    this.onConnectionStateChangeCallback = callback;
  }
  
  close() {
    if (this.peerConnection) {
      console.log('[WebRTC] Closing peer connection');
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.localStream) {
      console.log('[WebRTC] Stopping local media tracks');
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[WebRTC] Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }
    
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.retryCount = 0;
    console.log('[WebRTC] Connection closed and resources released');
  }
}

export default new WebRTCService();