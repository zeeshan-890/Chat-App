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

  useEffect(() => {
    if (!user || !socket) {
      return;
    }
    let isCaller = call && call.type === 'outgoing';
    let remoteUserId = isCaller ? selecteduser._id : (call && call.user && call.user._id);
    if (!remoteUserId) {
      return;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    const pc = new RTCPeerConnection(rtcConfiguration);
    pcRef.current = pc;

    if (isCaller) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        streamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        if (!pc || pc.signalingState === 'closed') return;
        stream.getTracks().forEach(track => {
          pcRef.current.addTrack(track, stream);
        });
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('call-user', {
            to: remoteUserId,
            from: user._id,
            name: user.name,
            profileImg: user.profileImg || '',
            signal: offer,
          });
          startCallTimeout();
        });
      });
    }

    pc.ontrack = (event) => {
      if (userVideoRef.current && event.streams[0]) {
        userVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: remoteUserId,
          from: user._id,
          candidate: event.candidate,
        });
      }
    };

    const handleIncomingCallSignal = async (signal) => {
      if (!isCaller && signal) {
        if (pc.signalingState === 'closed') {
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = stream;
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          stream.getTracks().forEach(track => {
            pcRef.current.addTrack(track, stream);
          });
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
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

    const handleCallAnsweredSignal = async (signal) => {
      if (isCaller && signal) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    };

    const handleIceCandidateSignal = async (candidate) => {
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    window.handleIncomingCallSignal = handleIncomingCallSignal;
    window.handleCallAnsweredSignal = handleCallAnsweredSignal;
    window.handleIceCandidateSignal = handleIceCandidateSignal;

    processPendingSignals();

    return () => {
      pc.close();
      delete window.handleIncomingCallSignal;
      delete window.handleCallAnsweredSignal;
      delete window.handleIceCandidateSignal;
      if (pcRef.current) pcRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      clearInterval(timerInterval.current);
    };
  }, [socket]);

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
