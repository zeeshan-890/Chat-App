import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userauthstore } from '../Store/UserAuthStore';
import { callPeer } from '../services/PeerService';
import toast from 'react-hot-toast';
import '../styles/videoCallPage.css';

const Videocall = () => {
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    localStream,
    setLocalStream,
    user,
    selecteduser,
    call,
    peer,
    peerId,
    peerCall,
    setPeerCall,
    callStatus,
    callDuration,
    remoteStream,
    startCall,
    answerCall: storeAnswerCall,
    endCall,
    rejectCall,
    startCallDurationTimer,
    stopCallDurationTimer,
    startCallTimeout,
    stopCallTimeout,
    cleanupMediaStreams,
    socket,
  } = userauthstore();

  // 1. Initialize PeerJS on mount (if not already)
  useEffect(() => {
    if (user && !peer) {
      userauthstore.getState().initPeer(user._id);
    }
  }, [user, peer]);

  // 2. Get user media on mount
  useEffect(() => {
    if (!localStream) {
      const timeout = setTimeout(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            setLocalStream(stream);
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
          })
          .catch(err => {
            setErrorMessage('Could not access camera or microphone.');
            toast.error('Could not access camera or microphone.');
            console.error(err);
          });
      }, 600); // Try 600ms or even 1000ms
      return () => clearTimeout(timeout);
    } else {
      if (myVideoRef.current) myVideoRef.current.srcObject = localStream;
    }
  }, [localStream, setLocalStream]);

  // 3. Handle incoming calls
  useEffect(() => {
    if (!peer) return;
    const handler = callObj => {
      // Wait for localStream to be ready before answering
      if (!localStream) {
        // Wait and retry (simple version)
        const interval = setInterval(() => {
          if (userauthstore.getState().localStream) {
            clearInterval(interval);
            userauthstore.getState().answerCall(callObj, callObj.peer, userauthstore.getState().localStream);
            callObj.on('stream', remoteStream => {
              if (userVideoRef.current) userVideoRef.current.srcObject = remoteStream;
            });
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 3000); // Give up after 3s
        return;
      }
      storeAnswerCall(callObj, callObj.peer, localStream);
      callObj.on('stream', remoteStream => {
        if (userVideoRef.current) userVideoRef.current.srcObject = remoteStream;
      });
      callObj.on('close', () => {
        endCall();
        toast('Call ended');
        navigate('/');
      });
      callObj.on('error', err => {
        setErrorMessage('Call error: ' + err.message);
        toast.error('Call error: ' + err.message);
      });
    };
    peer.on('call', handler);
    return () => { peer.off('call', handler); };
  }, [peer, localStream, storeAnswerCall, endCall, navigate]);

  // 4. Outgoing call logic
  useEffect(() => {
    if (
      call &&
      call.type === 'outgoing' &&
      selecteduser &&
      selecteduser._id &&
      localStream &&
      peer &&
      !peerCall
    ) {
      const callObj = callPeer(
        selecteduser._id,
        localStream,
        (remoteStream) => {
          if (userVideoRef.current) userVideoRef.current.srcObject = remoteStream;
        },
        user.name,
        user.profileImg
      );
      setPeerCall(callObj);
      callObj.on('close', () => {
        endCall();
        // toast('Call ended');
        navigate('/');
      });
      callObj.on('error', err => {
        setErrorMessage('Call error: ' + err.message);
        toast.error('Call error: ' + err.message);
      });
      startCallTimeout();
    }
  }, [call, selecteduser, localStream, peer, peerCall, setPeerCall, endCall, navigate, startCallTimeout, user]);

  // 5. Listen for socket events (call-rejected, end-call, call-timeout)
  useEffect(() => {
    if (!socket) return;
    const onRejected = () => {
      // toast.error('Call was rejected');
      endCall();
      navigate('/');
    };
    const onEnded = () => {
      // toast('Call ended');
      endCall();
      navigate('/');
    };
    const onTimeout = () => {
      toast.error('Call not answered');
      endCall();
      navigate('/');
    };
    socket.on('call-rejected', onRejected);
    socket.on('end-call', onEnded);
    socket.on('call-timeout', onTimeout);
    return () => {
      socket.off('call-rejected', onRejected);
      socket.off('end-call', onEnded);
      socket.off('call-timeout', onTimeout);
    };
  }, [socket, endCall, navigate]);

  // 6. Start/stop call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      startCallDurationTimer();
      stopCallTimeout();
    }
    if (!call) {
      stopCallDurationTimer();
      stopCallTimeout();
      navigate('/');
    }
  }, [callStatus, call, startCallDurationTimer, stopCallDurationTimer, stopCallTimeout]);

  // 7. Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if navigating away from /videocall, not remounting
      userauthstore.getState().cleanupMediaStreams();
      userauthstore.getState().stopCallDurationTimer();
      userauthstore.getState().stopCallTimeout();
      if (myVideoRef.current) myVideoRef.current.srcObject = null;
      if (userVideoRef.current) userVideoRef.current.srcObject = null;
    };
  }, []);
  // 8. Sync remoteStream to userVideoRef
  useEffect(() => {
    if (userVideoRef.current && remoteStream) {
      userVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 9. End call handler
  const handleEndCall = () => {
    if (call && call.user && call.user._id) {
      endCall(call.user._id);
    }
    navigate('/');
  };

  // 10. Format timer
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

      {/* Error message display */}
      {errorMessage && (
        <div className="error-overlay">
          <p className="error-message">{errorMessage}</p>
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}

      {/* Top Info Bar */}
      <div className="top-bar">
        <img src={remoteProfile || '/avatar.jpg'} alt="User" className="user-avatar" />
        <span className="user-name">{remoteName}</span>
        <div className="call-info">
          <span className="call-status">
            {callStatus === 'connected'
              ? '🟢 Connected'
              : callStatus === 'ringing'
                ? '📞 Calling...'
                : `🔄 ${callStatus || 'Connecting'}`}
          </span>
          <span className="call-timer">
            {callStatus === 'connected'
              ? formatTime(callDuration)
              : '00:00'}
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
