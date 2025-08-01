import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userauthstore } from '../Store/UserAuthStore';
import '../styles/videoCallPage.css';

const rtcConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ]
    },
    // Add TURN servers for mobile/NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

const Videocall = () => {
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const pcRef = useRef();
  const streamRef = useRef();
  const navigate = useNavigate();
  const [timer] = useState(0);
  const timerInterval = useRef();
  const iceCandidateQueue = useRef([]); // Queue to store candidates that arrive early

  const {
    user,
    selecteduser,
    call,
    setselecteduser,
    endCall,
    socket,
    processPendingSignals,
    callStatus,
    startCallTimeout,
    callDuration,
    startCallDurationTimer,
  } = userauthstore();

  // Function to process queued ICE candidates
  const processIceCandidateQueue = async () => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') return;

    // Process any queued ICE candidates
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Successfully added queued ICE candidate");
      } catch (error) {
        console.error("Error adding queued ICE candidate:", error);
      }
    }
  };

  useEffect(() => {
    if (!user || !socket) {
      return;
    }
    
    let isCaller = call && call.type === 'outgoing';
    let remoteUserId = isCaller ? selecteduser._id : (call && call.user && call.user._id);
    
    if (!remoteUserId) {
      return;
    }

    // Clean up any previous connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Clear the ICE candidate queue
    iceCandidateQueue.current = [];

    // Create new RTCPeerConnection
    const pc = new RTCPeerConnection(rtcConfiguration);
    pcRef.current = pc;

    // Debug connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state changed:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("Signaling state:", pc.signalingState);
    };

    // Handle incoming media tracks
    pc.ontrack = (event) => {
      console.log("Track received:", event.track.kind);
      if (userVideoRef.current && event.streams[0]) {
        userVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit('ice-candidate', {
          to: remoteUserId,
          from: user._id,
          candidate: event.candidate,
        });
      }
    };

    // Caller logic
    if (isCaller) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          console.log("Got local stream with tracks:", stream.getTracks().map(t => t.kind).join(', '));
          streamRef.current = stream;
          
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          
          if (!pc || pc.signalingState === 'closed') return;
          
          // Add tracks to the peer connection
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
          
          // Create and send offer
          return pc.createOffer();
        })
        .then((offer) => {
          if (!pc || pc.signalingState === 'closed') return;
          console.log("Setting local description (offer)");
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (!pc || pc.signalingState === 'closed') return;
          
          console.log("Sending call offer");
          socket.emit('call-user', {
            to: remoteUserId,
            from: user._id,
            name: user.name,
            profileImg: user.profileImg || '',
            signal: pc.localDescription,
          });
          
          startCallTimeout();
        })
        .catch((error) => {
          console.error("Error in caller setup:", error);
        });
    }

    // Handle incoming call signal (for callee)
    const handleIncomingCallSignal = async (signal) => {
      if (!isCaller && signal) {
        if (pc.signalingState === 'closed') {
          return;
        }
        
        try {
          console.log("Processing incoming call signal");
          
          // Get user media
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          console.log("Got local stream with tracks:", stream.getTracks().map(t => t.kind).join(', '));
          streamRef.current = stream;
          
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          
          // Add tracks to the peer connection
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
          
          // Set remote description
          console.log("Setting remote description (offer)");
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          
          // Process any queued ICE candidates now that remote description is set
          await processIceCandidateQueue();
          
          // Create and set local description (answer)
          console.log("Creating answer");
          const answer = await pc.createAnswer();
          
          console.log("Setting local description (answer)");
          await pc.setLocalDescription(answer);
          
          // Send answer
          console.log("Sending call answer");
          socket.emit('answer-call', {
            to: remoteUserId,
            from: user._id,
            signal: answer,
          });
          
        } catch (error) {
          console.error("Error handling incoming call:", error);
        }
      }
    };

    // Handle call answered signal (for caller)
    const handleCallAnsweredSignal = async (signal) => {
      if (isCaller && signal) {
        try {
          console.log("Processing call answered signal");
          console.log("Setting remote description (answer)");
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          
          // Process any queued ICE candidates now that remote description is set
          await processIceCandidateQueue();
          
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    };

    // Handle ICE candidate (for both caller and callee)
    const handleIceCandidateSignal = async (candidate) => {
      if (candidate) {
        try {
          // If remote description is set, add candidate immediately
          if (pc.remoteDescription) {
            console.log("Adding ICE candidate directly");
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Otherwise queue the candidate for later
            console.log("Queueing ICE candidate for later");
            iceCandidateQueue.current.push(candidate);
          }
        } catch (error) {
          console.error("Error handling ICE candidate:", error);
        }
      }
    };

    // Attach handlers to window for UserAuthStore to call
    window.handleIncomingCallSignal = handleIncomingCallSignal;
    window.handleCallAnsweredSignal = handleCallAnsweredSignal;
    window.handleIceCandidateSignal = handleIceCandidateSignal;

    // Process any signals that arrived before component mounted
    processPendingSignals();

    // Cleanup function
    return () => {
      if (pc) {
        pc.close();
      }
      
      // Remove window handlers
      delete window.handleIncomingCallSignal;
      delete window.handleCallAnsweredSignal;
      delete window.handleIceCandidateSignal;
      
      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // Clear timers
      clearInterval(timerInterval.current);
      
      // Clear queue
      iceCandidateQueue.current = [];
    };
  }, [socket, user, selecteduser, call]); // Add proper dependencies here

  const handleEndCall = () => {
    if (call && call.user && call.user._id) {
      endCall(call.user._id);
    }
    setselecteduser(null);
    navigate('/');
  };

  useEffect(() => {
    if (!call) {
      navigate('/');
    }
  }, [call, navigate]);

  useEffect(() => {
    if (call && call.type === 'in-call' && callStatus === 'connected') {
      startCallDurationTimer();
    }
  }, [call, callStatus, startCallDurationTimer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const remoteUser = call && call.type === 'outgoing' ? selecteduser : (call && call.user ? call.user : null);
  const remoteName = remoteUser ? remoteUser.name : '';
  const remoteProfile = remoteUser ? remoteUser.profileImg : '';

  return (
    <div className="call-container">
      {/* Other User's Video */}
      <video
        ref={userVideoRef}
        className="user-video"
        autoPlay
        playsInline
        onError={(e) => console.error("Remote video error:", e)}
      />

      {/* Top Info Bar */}
      <div className="top-bar">
        <img src={remoteProfile || '/src/assets/avatar.jpg'} alt="User" className="user-avatar" />
        <span className="user-name">{remoteName}</span>
        <div className="call-info">
          <span className="call-status">
            {callStatus === 'connected' ? '🟢 Connected' : callStatus === 'ringing' ? '📞 Calling...' : ''}
          </span>
          <span className="call-timer">
            {callStatus === 'connected' ? formatTime(callDuration) : formatTime(timer)}
          </span>
        </div>
      </div>

      {/* Call Status Overlay */}
      {callStatus === 'ringing' && (
        <div className="call-status-overlay">
          <div className="ringing-animation">
            <div className="ringing-dot"></div>
            <div className="ringing-dot"></div>
            <div className="ringing-dot"></div>
          </div>
          <p className="ringing-text">Calling {remoteName}...</p>
        </div>
      )}

      {/* Your Video in Bottom Right */}
      <video
        ref={myVideoRef}
        className="my-video"
        autoPlay
        muted
        playsInline
        onError={(e) => console.error("Local video error:", e)}
      />

      {/* End Call Button */}
      <button className="end-call-button" onClick={handleEndCall}>
        🔴 End Call
      </button>
    </div>
  );
};

export default Videocall;
