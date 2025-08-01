import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userauthstore } from '../Store/UserAuthStore';
import WebRTCService from '../services/WebRTCService';
import '../styles/videoCallPage.css';

const Videocall = () => {
  // Add this to track if component is already mounted
  const isInitializedRef = useRef(false);
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const streamRef = useRef();
  const navigate = useNavigate();
  const [connectionState, setConnectionState] = useState('new');
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    user,
    selecteduser,
    call,
    setselecteduser,
    endCall,
    socket,
    processPendingSignals,
    callStatus,
    callDuration,
    startCallDurationTimer,
  } = userauthstore();

  // Function to initialize user media
  const initializeMedia = async (isCaller) => {
    try {
      console.log('Initializing media');
      const stream = await WebRTCService.getUserMedia();
      streamRef.current = stream;
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      
      setLocalStreamReady(true);
      
      if (isCaller) {
        WebRTCService.addLocalStreamTracks();
        await WebRTCService.createAndSendOffer();
      } else {
        WebRTCService.addLocalStreamTracks();
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setErrorMessage('Could not access camera or microphone. Please check permissions.');
    }
  };

  // Initialize WebRTC connection
  useEffect(() => {
    if (!user || !socket || !call) return;

    console.log("Call state changed:", call);

    const isCaller = call.type === 'outgoing';
    const remoteUser = isCaller 
      ? selecteduser 
      : (call && call.user ? call.user : null);

    if (!remoteUser) {
      console.error('Remote user information not available');
      return;
    }

    // Only initialize if we don't already have a connection
    // This prevents the connection from being recreated when call.type changes to 'in-call'
    if (!WebRTCService.peerConnection) {
      console.log(`Initializing WebRTC as ${isCaller ? 'caller' : 'callee'}`);

      // Initialize WebRTC service
      WebRTCService.initialize(socket, user, remoteUser, isCaller);
      
      // Handle connection state changes
      WebRTCService.onConnectionStateChange((state) => {
        console.log(`Connection state changed to: ${state}`);
        setConnectionState(state);
        if (state === 'connected' || state === 'completed') {
          startCallDurationTimer();
        }
      });
      
      // Handle remote video
      WebRTCService.onTrack((stream) => {
        console.log('Remote track received, setting to video element');
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      });

      // Setup socket event handlers directly in the component
      const handleIncomingCall = async (data) => {
        if (!isCaller && data && data.signal) {
          try {
            console.log('Received incoming call signal');
            
            // Initialize media first
            await initializeMedia(false);
            
            // Handle the offer
            await WebRTCService.handleRemoteOffer(data.signal);
            
          } catch (error) {
            console.error('Error handling incoming call:', error);
            setErrorMessage('Failed to establish connection');
          }
        }
      };
      
      const handleCallAnswered = async (data) => {
        if (isCaller && data && data.signal) {
          try {
            console.log('Call was answered, processing answer');
            await WebRTCService.handleRemoteAnswer(data.signal);
          } catch (error) {
            console.error('Error handling call answer:', error);
            setErrorMessage('Failed to establish connection after answer');
          }
        }
      };
      
      const handleIceCandidate = async (data) => {
        if (data && data.candidate) {
          try {
            console.log('Received ICE candidate');
            await WebRTCService.handleRemoteIceCandidate(data.candidate);
          } catch (error) {
            console.error('Error handling ICE candidate:', error);
          }
        }
      };

      // Add socket event listeners
      socket.on('incoming-call', handleIncomingCall);
      socket.on('call-answered', handleCallAnswered);
      socket.on('ice-candidate', handleIceCandidate);

      // For caller, initialize media immediately
      if (isCaller) {
        initializeMedia(true);
      }

      // If this is the callee, register window functions for pending signals
      if (!isCaller) {
        window.handleIncomingCallSignal = (signal) => {
          handleIncomingCall({ signal });
        };
        
        window.handleCallAnsweredSignal = (signal) => {
          handleCallAnswered({ signal });
        };
        
        window.handleIceCandidateSignal = (candidate) => {
          handleIceCandidate({ candidate });
        };
        
        // Process any signals that arrived before component mounted
        processPendingSignals();
      }

      // Cleanup function
      return () => {
        if (!call) {
          // Only clean up if call is null (call ended)
          console.log('Cleaning up video call component');
          WebRTCService.close();
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          setLocalStreamReady(false);
        }
      };
    }

    // This important line guarantees we only depend on call's existence, not its internal properties
    // This prevents the effect from re-running when call.type changes to 'in-call'
  }, [user, socket, selecteduser, call]); // <--- Only depend on call, not Boolean(call) or call.type

  // React to call.type changes here, but DO NOT clean up WebRTC here!
  // For example, update UI or timers.
  useEffect(() => {
    // Handle call type changes (e.g., incoming to ongoing)
    if (call) {
      console.log(`Call type changed to: ${call.type}`);
      // You can add additional logic here if needed
    }
  }, [call?.type]);

  const handleEndCall = () => {
    if (call && call.user && call.user._id) {
      endCall(call.user._id);
    }
    setselecteduser(null);
    navigate('/');
  };

  useEffect(() => {
    // Only navigate away if the component has been fully initialized
    // and there's no call object
    if (isInitializedRef.current && !call) {
      navigate('/');
    } else if (call) {
      // Mark as initialized once we have a call object
      isInitializedRef.current = true;
    }
  }, [call, navigate]);

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
            {connectionState === 'connected' || connectionState === 'completed' 
              ? '🟢 Connected' 
              : callStatus === 'ringing' 
                ? '📞 Calling...' 
                : `🔄 ${connectionState}`}
          </span>
          <span className="call-timer">
            {(connectionState === 'connected' || connectionState === 'completed') 
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
