import { create } from 'zustand'
import axiosInstance from './AxiosInstance'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { createPeer, getPeer, closeCall, answerCall as peerAnswerCall } from '../services/PeerService';

const BASE_URl = import.meta.env.MODE === 'development' ? 'http://localhost:3000' : '/'

// jj


export const userauthstore = create((set, get) => ({




    user: null,
    searcheduser: null,
    isSigningup: false,
    isloggingin: false,
    isupdatinguser: false,
    islogingout: false,
    ischeckingauth: false,
    sidebarusers: [],
    issettingsidebaruser: false,
    selecteduser: null,
    socket: null,
    onlineusers: [],

    // Call state
    call: null, // { type: 'outgoing' | 'incoming' | 'in-call', user: {}, signal: {}, ... }
    incomingCall: null, // { from, name, profileImg, signal }
    callTimer: 0,
    callInterval: null,
    callDuration: 0, // Duration of active call (from answer to end)
    callDurationInterval: null, // Interval for call duration timer
    callStatus: null, // 'ringing' | 'connected' | 'ended' | 'offline'
    callTimeout: null, // Timeout for auto-ending calls
    ringtone: null, // Audio element for ringtone
    pendingSignals: [], // Initialize as empty array to prevent "not iterable" errors
    peerId: null,
    peer: null,
    peerCall: null,
    remoteStream: null,
    localStream: null,

    setPeerCall: (call) => {
        console.log('[UserAuthStore] setPeerCall called:', call);
        set({ peerCall: call });
    },

    setLocalStream: (stream) => set({ localStream: stream }),

    setIncomingCall: (data) => {
        console.log('[UserAuthStore] setIncomingCall called:', data);
        set({ incomingCall: data });
        get().playRingtone();
    },
    setselecteduser: (data) => {
        console.log('[UserAuthStore] setselecteduser called:', data);
        set({ selecteduser: data })
    },

    setsearcheduser: (data) => {
        console.log('[UserAuthStore] setsearcheduser called:', data);
        set({ searcheduser: data })
    },

    // Process pending signals when component is ready
    processPendingSignals: () => {
        const { pendingSignals } = get();
        console.log('[UserAuthStore] processPendingSignals called. pendingSignals:', pendingSignals);

        // Defensive check to ensure pendingSignals is iterable
        if (!pendingSignals || !Array.isArray(pendingSignals)) {
            console.warn('pendingSignals is not properly initialized');
            set({ pendingSignals: [] });
            return;
        }

        console.log(`Processing ${pendingSignals.length} pending signals`);

        // Process all pending signals
        pendingSignals.forEach(signal => {
            try {
                if (signal.type === 'incoming-call' && window.handleIncomingCallSignal) {
                    window.handleIncomingCallSignal(signal.data.signal);
                } else if (signal.type === 'call-answered' && window.handleCallAnsweredSignal) {
                    window.handleCallAnsweredSignal(signal.data.signal);
                } else if (signal.type === 'ice-candidate' && window.handleIceCandidateSignal) {
                    window.handleIceCandidateSignal(signal.data.candidate);
                }
            } catch (error) {
                console.error('Error processing signal:', error, signal);
            }
        });

        // Clear processed signals
        set({ pendingSignals: [] });
    },

    // Start auto-end timer for outgoing calls
    startCallTimeout: () => {
        const { call } = get();
        console.log('[UserAuthStore] startCallTimeout called. call:', call);
        if (!call || call.type !== 'outgoing') return;

        const timeout = setTimeout(() => {
            const { call: currentCall } = get();
            if (currentCall && currentCall.type === 'outgoing') {
                get().endCall(currentCall.user._id);
                toast.error('Call timed out - no answer received');
            }
        }, 15000); // 15 seconds

        set({ callTimeout: timeout });
    },

    // Start call duration timer (from answer to end)
    startCallDurationTimer: () => {
        const { callDurationInterval } = get();
        console.log('[UserAuthStore] startCallDurationTimer called. callDurationInterval:', callDurationInterval);

        // Clear existing interval if any
        if (callDurationInterval) {
            clearInterval(callDurationInterval);
        }

        const interval = setInterval(() => {
            set((state) => ({ callDuration: state.callDuration + 1 }));
        }, 1000); // Update every second

        set({ callDurationInterval: interval });
    },

    // Ringtone functions
    playRingtone: (prime = false) => {
        console.log('[UserAuthStore] playRingtone called. prime:', prime);
        try {
            let { ringtone } = get();

            // Create audio element if it doesn't exist
            if (!ringtone) {
                ringtone = new Audio();

                // Set audio properties before assigning source
                ringtone.loop = true;
                ringtone.volume = 0.7;
                ringtone.preload = 'auto';

                // Set source - use a simple tone file
                ringtone.src = `/sounds/ringtone.mp3`;

                // Save the audio element
                set({ ringtone });
            }

            // Play with error handling
            try {
                ringtone.currentTime = 0;
                const playPromise = ringtone.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        if (prime) {
                            ringtone.pause();
                        }
                    }).catch((err) => {
                        console.log('Could not play ringtone (user interaction required):', err);
                    });
                }
            } catch (err) {
                console.log('Could not play ringtone:', err);
            }
        } catch (error) {
            console.error('Error in ringtone playback:', error);
        }
    },

    stopRingtone: () => {
        console.log('[UserAuthStore] stopRingtone called.');
        const { ringtone } = get();
        if (ringtone) {
            ringtone.pause();
            ringtone.currentTime = 0;
        }
    },

    // Call actions
    startCall: (callee) => {
        const { user, onlineusers, socket } = get();
        if (!user || !callee) return;

        if (!onlineusers.includes(callee._id)) {
            toast.error(`${callee.name} appears to be offline, but you can still try calling`);
        }

        set({
            call: { type: 'outgoing', user: callee, started: Date.now() },
            callTimer: 0,
            callStatus: 'ringing'
        });

        // Emit call-user event to callee
        if (socket) {
            socket.emit('call-user', {
                to: callee._id,
                from: user._id,
                name: user.name,
                profileImg: user.profileImg
            });
        }

        get().startCallTimeout();
    },
    answerCall: (callObj, fromPeerId, navigate) => {
        console.log('[UserAuthStore] answerCall called. callObj:', callObj);
        const { user, socket } = get();
        set({
            callStatus: 'connected',
            call: {
                type: 'in-call',
                user: { _id: fromPeerId, name: callObj.metadata?.name || 'Unknown', profileImg: callObj.metadata?.profileImg || '/avatar.jpg' },
                peerId: fromPeerId,
                started: Date.now()
            },
            peerCall: callObj,
            incomingCall: null,
        });

        // Emit answer-call event to caller
        if (socket) {
            socket.emit('answer-call', { to: fromPeerId, from: user?._id });
        }

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(localStream => {
                callObj.answer(localStream);
                callObj.on('stream', remoteStream => {
                    set({ remoteStream });
                });
                navigate('/videocall');
                get().startCallDurationTimer();
                get().stopCallTimeout();
                get().stopRingtone();
            })
            .catch(err => {
                toast.error('Could not access camera/microphone. Please check permissions.');
                set({
                    call: null,
                    callStatus: null,
                    peerCall: null,
                    incomingCall: null,
                });
                closeCall();
            });
    },

    rejectCall: (fromPeerId) => {
        const { socket, user } = get();
        // Emit call-rejected event to caller
        if (socket) socket.emit('call-rejected', { to: fromPeerId, from: user?._id });
        get().cleanupMediaStreams();
        get().stopCallDurationTimer();
        get().stopCallTimeout();
        closeCall();
        set({
            call: null,
            callStatus: null,
            peerCall: null,
            incomingCall: null,
            remoteStream: null,
        });
    },
    endCall: (to) => {
        const { socket, user } = get();
        get().stopRingtone();
        get().stopCallDurationTimer();
        get().stopCallTimeout();
        get().cleanupMediaStreams();
        // Emit end-call event to peer
        if (socket && to) socket.emit('end-call', { to, from: user?._id });
        set({
            call: null,
            callTimer: 0,
            callDuration: 0,
            callStatus: null,
            callTimeout: null,
            callDurationInterval: null,
            peerCall: null,
            incomingCall: null,
            remoteStream: null,
        });
        closeCall();
    },
    // Call timer logic
    startCallTimer: () => {
        console.log('[UserAuthStore] startCallTimer called.');
        const interval = setInterval(() => {
            set((state) => ({ callTimer: state.callTimer + 1 }));
        }, 1000);
        set({ callInterval: interval });
    },
    stopCallTimer: () => {
        console.log('[UserAuthStore] stopCallTimer called.');
        const { callInterval } = get();
        if (callInterval) clearInterval(callInterval);
        set({ callInterval: null, callTimer: 0 });
    },
    // Socket event listeners for call signaling
    setupCallListeners: () => {
        const { socket } = get();
        console.log('[UserAuthStore] setupCallListeners called. socket:', socket);
        if (!socket) return;

        socket.on('incoming-call', (data) => {
            console.log('[UserAuthStore] Socket incoming-call event:', data);
            set({
                incomingCall: data,
                callStatus: 'ringing'
            });

            get().playRingtone();

            // Store the signal for WebRTCService to process
            set((state) => ({
                pendingSignals: [...(state.pendingSignals || []), { type: 'incoming-call', data }]
            }));
        });

        socket.on('call-answered', (data) => {
            console.log('[UserAuthStore] Socket call-answered event:', data);
            // IMPORTANT: Don't change the call object structure here, just update the type
            // This prevents re-renders that might unmount the component
            set((state) => ({
                callStatus: 'connected',
                // Update the call's type property without recreating the object
                call: state.call ? {
                    ...state.call,
                    type: 'in-call'
                } : state.call
            }));

            // Clear timeout since call was answered
            const { callTimeout } = get();
            if (callTimeout) {
                clearTimeout(callTimeout);
                set({ callTimeout: null });
            }

            // Store the signal for WebRTCService to process
            set((state) => ({
                pendingSignals: [...(state.pendingSignals || []), { type: 'call-answered', data }]
            }));
        });

        // Call rejected
        socket.on('call-rejected', () => {
            console.log('[UserAuthStore] Socket call-rejected event');
            // Stop ringtone
            get().stopRingtone();

            const { callTimeout, callDurationInterval } = get();
            if (callTimeout) {
                clearTimeout(callTimeout);
            }
            if (callDurationInterval) {
                clearInterval(callDurationInterval);
            }
            set({
                call: null,
                callStatus: null,
                callTimeout: null,
                callDuration: 0,
                callDurationInterval: null,
                peerCall: null,
                incomingCall: null,
                remoteStream: null,
            });
            toast.error('Call was rejected');
        });

        // End call
        socket.on('end-call', () => {
            console.log('[UserAuthStore] Socket end-call event');
            // Stop ringtone
            get().stopRingtone();

            const { callTimeout, callDurationInterval } = get();
            if (callTimeout) {
                clearTimeout(callTimeout);
            }
            if (callDurationInterval) {
                clearInterval(callDurationInterval);
            }
            set({
                call: null,
                incomingCall: null,
                callStatus: null,
                callTimeout: null,
                callDuration: 0,
                callDurationInterval: null,
                peerCall: null,
                remoteStream: null,
            });
            toast('Call ended');
        });

        socket.on('call-timeout', () => {
            get().stopRingtone();
            get().stopCallTimeout();
            get().stopCallDurationTimer();
            get().cleanupMediaStreams();
            set({
                call: null,
                incomingCall: null,
                callStatus: null,
                callTimeout: null,
                callDuration: 0,
                callDurationInterval: null,
                peerCall: null,
                remoteStream: null,
            });
            toast.error('Call not answered');
        });

        // ICE candidate
        socket.on('ice-candidate', (data) => {
            console.log('[UserAuthStore] Socket ice-candidate event:', data);

            // If we're in a video call component, process the candidate directly
            if (window.handleIceCandidateSignal && data.candidate) {
                window.handleIceCandidateSignal(data.candidate);
            } else {
                // Otherwise queue the candidate for when the component is ready
                // Use defensive programming to avoid "not iterable" errors
                set((state) => ({
                    pendingSignals: [...(state.pendingSignals || []), { type: 'ice-candidate', data }]
                }));
            }
        });
    },
    // Add message event listeners after setupCallListeners
    setupMessageListeners: () => {
        const { socket } = get();
        console.log('[UserAuthStore] setupMessageListeners called. socket:', socket);
        if (!socket) return;

        // Check if listener already exists
        const existingListeners = socket.listeners('newMessage');
        if (existingListeners.length > 0) {
            return; // Listener already exists, don't add another
        }

        // Listen for new messages
        socket.on('newMessage', (message) => {
            console.log('New message received:', message);

            const { selecteduser } = get();

            // Show toast notification only if chat is not open with sender
            if (!selecteduser || selecteduser._id !== message.sender) {
                toast.success('New message received!');
            }

            // If chat is open with the sender, add message to current chat
            if (selecteduser && selecteduser._id === message.sender) {
                // Add message to messagestore
                import('./Messagestore').then(module => {
                    const messageStore = module.messagestore.getState();
                    messageStore.addMessage(message);
                });
            }

            // Always trigger unread count update for all contact cards
            window.dispatchEvent(new CustomEvent('updateUnreadCount', {
                detail: { userId: message.sender }
            }));

            // If chat is open with the sender, auto mark as read after a small delay
            if (selecteduser && selecteduser._id === message.sender) {
                setTimeout(() => {
                    import('./Messagestore').then(module => {
                        module.messagestore.getState().markread(message.sender);
                        // Trigger another update after marking as read
                        window.dispatchEvent(new CustomEvent('updateUnreadCount', {
                            detail: { userId: message.sender }
                        }));
                    });
                }, 500);
            }
        });
    },

    connectSocket: () => {
        const { user } = get()
        console.log('[UserAuthStore] connectSocket called. user:', user);
        if (!user || get().socket?.connected) return;

        const socket = io(BASE_URl, {
            query: { userId: user._id }
        })

        socket.connect()
        set({ socket: socket })

        socket.on('connect', () => {
            console.log('Socket connected');
            // Set up listeners only once when socket connects
            get().setupCallListeners();
            get().setupMessageListeners();
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error("Socket connection error:", error);
        });

        socket.on('getonline', (userids) => {
            set({ onlineusers: userids })
        })

        // Test response handler
        socket.on('test-response', () => { });
    },
    disconnectSocket: () => {
        console.log('[UserAuthStore] disconnectSocket called.');
        const { socket } = get();
        if (socket?.connected) {
            socket.off('newMessage'); // Clean up message listeners
            socket.disconnect();
        }
        set({ socket: null });
    },
    login: async (data, navigate) => {
        console.log('[UserAuthStore] login called. data:', data);
        try {
            set({ isloggingin: true })


            const res = await axiosInstance.post("/user/login", data)

            if (res.status === 200) {
                set({ user: res.data.user })
                get().connectSocket()
                toast.success(res.data.message)
                navigate("/")

            }


        }
        catch (error) {
            toast.error(error.response.data.message || "Server Error")
            console.log("error in logging in :", error)
        }
        finally {
            set({ isloggingin: false })
        }


    },
    signup: async (data, navigate) => {
        console.log('[UserAuthStore] signup called. data:', data);
        try {
            set({ isSigningup: true })


            const res = await axiosInstance.post("/user/sign-up", data)

            if (res.status === 200) {
                set({ user: res.data.user })
                get().connectSocket()
                toast.success(res.data.message)
                navigate("/")
            }


        }
        catch (error) {
            toast.error(error.response.data.message || "Server Error")
            console.log("error in logging in :", error)
        }
        finally {
            set({ isSigningup: false })
        }


    },
    logout: async (navigate) => {
        console.log('[UserAuthStore] logout called.');
        try {
            set({ islogingout: true })

            console.log(" in user auth store : logging out .... ");

            const res = await axiosInstance.get("/user/logout")


            if (res.status === 200) {
                set({ user: null })
                toast.success(res.data.message)
                get().disconnectSocket()
                navigate("/login")
            }

        }
        catch (error) {
            console.log("error in logging in :", error)
            toast.error(error.response.data.message || "Server Error")
        }
        finally {
            set({ islogingout: false })
        }


    },
    editprofile: async (data) => {
        console.log('[UserAuthStore] editprofile called. data:', data);
        set({ isupdatinguser: true })

        try {


            console.log(" in user auth store : logging out .... ");

            const res = await axiosInstance.post("/user/update", data)
            if (res.status === 200) {
                set({ user: res.data.user })
                toast.success(res.data.message)
                console.log(res.data);

            }

        }
        catch (error) {
            console.log("error in logging in :", error)
            toast.error(error.response.data.message)
        }
        finally {
            set({ isupdatinguser: false })
        }

    },

    checkauth: async () => {
        console.log('[UserAuthStore] checkauth called.');
        set({ ischeckingauth: true })
        try {




            const res = await axiosInstance.get("/user/check")


            if (res.status === 200) {
                set({ user: res.data.user })
                get().connectSocket()
            }

        }
        catch (error) {
            console.log("error in checkauth in :", error)

        }
        finally {
            set({ ischeckingauth: false })
        }

    },

    getusersforsidebar: async () => {
        console.log('[UserAuthStore] getusersforsidebar called.');
        try {
            set({ issettingsidebaruser: true })


            const res = await axiosInstance.get("/user/getusers")

            set({ sidebarusers: res.data.users })
        }
        catch (error) {
            console.log(error);

        }
        finally {
            set({ issettingsidebaruser: false })
        }

    },
    initPeer: (id) => {
        console.log('[UserAuthStore] initPeer called. id:', id);
        const peer = createPeer(id); // from your PeerService.js
        set({ peer, peerId: id });
        peer.on('open', (pid) => {
            console.log('[UserAuthStore] PeerJS open event. pid:', pid);
            set({ peerId: pid });
        });
        peer.on('error', (err) => console.error('PeerJS error:', err));

        peer.on('call', (callObj) => {
            console.log('[UserAuthStore] PeerJS incoming call event:', callObj);
            set({
                incomingCall: {
                    signal: callObj,
                    from: callObj.peer,
                    name: callObj.metadata?.name || 'Unknown',
                    profileImg: callObj.metadata?.profileImg || '/avatar.jpg'
                }
            });
            get().playRingtone(true);
        })

    },
    stopCallTimeout: () => {
        const { callTimeout } = get();
        if (callTimeout) clearTimeout(callTimeout);
        set({ callTimeout: null });
    },

    stopCallDurationTimer: () => {
        const { callDurationInterval } = get();
        if (callDurationInterval) clearInterval(callDurationInterval);
        set({ callDurationInterval: null, callDuration: 0 });
    },

    // --- Cleanup Media Streams ---
    cleanupMediaStreams: () => {

        console.log("cleanup called.........");

        const { remoteStream, peerCall, localStream } = get();
        if (remoteStream) {
            try {
                remoteStream.getTracks().forEach(track => track.stop());
            } catch { }
            set({ remoteStream: null });
        }
        if (peerCall && peerCall.localStream) {
            try {
                peerCall.localStream.getTracks().forEach(track => track.stop());
            } catch { }
        }
        if (localStream) {
            try {
                localStream.getTracks().forEach(track => track.stop());
            } catch { }
            set({ localStream: null });
        }
        set({ peerCall: null });
    },

}))
