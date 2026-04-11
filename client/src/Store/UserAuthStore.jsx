import { create } from 'zustand'
import axiosInstance from './AxiosInstance'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { createPeer, closeCall, destroyPeer } from '../services/PeerService';

const SOCKET_BASE_URL = (import.meta.env.VITE_SOCKET_URL || '').trim()
    || (import.meta.env.MODE === 'development' ? 'http://localhost:3000' : window.location.origin);
const SOCKET_PATH = (import.meta.env.VITE_SOCKET_PATH || '/socket.io').trim() || '/socket.io';
const SOCKET_FORCE_POLLING = String(
    import.meta.env.VITE_SOCKET_FORCE_POLLING
    || (import.meta.env.MODE === 'production' ? 'true' : 'false')
).toLowerCase() === 'true';

let pendingPeerReinitTimeout = null;
let peerReinitAttempts = 0;
const MAX_PEER_REINIT_ATTEMPTS = 5;
let isPeerReinitInProgress = false;
let usePollingFallback = SOCKET_FORCE_POLLING;

// jj


export const userauthstore = create((set, get) => ({




    user: null,
    searcheduser: null,
    isSigningup: false,
    isloggingin: false,
    isupdatinguser: false,
    islogingout: false,
    ischeckingauth: false,
    hasCheckedAuth: false,
    sidebarusers: [],
    groups: [],
    issettingsidebaruser: false,
    isLoadingGroups: false,
    isCreatingGroup: false,
    isUpdatingGroup: false,
    showCreateGroupPanel: false,
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
    isPeerInitializing: false,
    isPeerUnavailable: false,
    peerCall: null,
    remoteStream: null,
    localStream: null,
    socketMonitorInterval: null, // <-- Add this to your initial state
    isSocketConnecting: false,
    socketTransportMode: SOCKET_FORCE_POLLING ? 'polling' : 'auto',

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

    openCreateGroupPanel: () => {
        set({ showCreateGroupPanel: true });
    },

    closeCreateGroupPanel: () => {
        set({ showCreateGroupPanel: false });
    },

    toggleCreateGroupPanel: () => {
        set((state) => ({ showCreateGroupPanel: !state.showCreateGroupPanel }));
    },

    upsertGroupInState: (group, options = {}) => {
        if (!group?._id) {
            return;
        }

        const normalizedGroup = {
            ...group,
            chatType: 'group',
        };

        set((state) => {
            const shouldSelect = options.select === true
                || (state.selecteduser?.chatType === 'group' && state.selecteduser?._id === normalizedGroup._id);

            return {
                groups: [normalizedGroup, ...state.groups.filter((existingGroup) => existingGroup._id !== normalizedGroup._id)],
                selecteduser: shouldSelect ? normalizedGroup : state.selecteduser,
            };
        });
    },

    removeGroupFromState: (groupId, clearSelection = false) => {
        set((state) => {
            const shouldClearSelected = clearSelection
                || (state.selecteduser?.chatType === 'group' && state.selecteduser?._id === groupId);

            const nextSearched = Array.isArray(state.searcheduser)
                ? state.searcheduser.filter((chat) => !(chat.chatType === 'group' && chat._id === groupId))
                : state.searcheduser;

            return {
                groups: state.groups.filter((group) => group._id !== groupId),
                selecteduser: shouldClearSelected ? null : state.selecteduser,
                searcheduser: nextSearched,
            };
        });
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

        if (callee.chatType === 'group') {
            toast.error('Video call is available only in direct chats.');
            return;
        }

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
    answerCall: async (callObj, fromPeerId, navigate) => {
        console.log('[UserAuthStore] answerCall called. callObj:', callObj);
        if (!callObj) {
            return;
        }

        const { user, socket, localStream } = get();

        try {
            let mediaStream = localStream;
            if (!mediaStream) {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                set({ localStream: mediaStream });
            }

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

            if (socket) {
                socket.emit('answer-call', { to: fromPeerId, from: user?._id });
            }

            callObj.answer(mediaStream);
            callObj.on('stream', remoteStream => {
                set({ remoteStream });
            });
            callObj.on('close', () => {
                get().endCall(fromPeerId);
            });
            callObj.on('error', (err) => {
                console.error('Peer call error while answering:', err);
                toast.error('Call connection error');
                get().endCall(fromPeerId);
            });

            get().stopCallTimeout();
            get().stopRingtone();

            if (typeof navigate === 'function') {
                navigate('/videocall');
            }
        } catch (err) {
            toast.error('Could not access camera/microphone. Please check permissions.');
            set({
                call: null,
                callStatus: null,
                peerCall: null,
                incomingCall: null,
            });
            closeCall();
        }
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

        // Ensure call listeners are not duplicated on reconnects
        socket.off('incoming-call');
        socket.off('call-answered');
        socket.off('call-rejected');
        socket.off('end-call');
        socket.off('call-timeout');

        socket.on('incoming-call', (data) => {
            console.log('[UserAuthStore] Socket incoming-call event:', data);
            set({
                incomingCall: data,
                callStatus: 'ringing'
            });

            get().playRingtone();

            // Store the signal for WebRTCService to process
            // set((state) => ({
            //     pendingSignals: [...(state.pendingSignals || []), { type: 'incoming-call', data }]
            // }));
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
        // socket.on('ice-candidate', (data) => {
        //     console.log('[UserAuthStore] Socket ice-candidate event:', data);

        //     // If we're in a video call component, process the candidate directly
        //     if (window.handleIceCandidateSignal && data.candidate) {
        //         window.handleIceCandidateSignal(data.candidate);
        //     } else {
        //         // Otherwise queue the candidate for when the component is ready
        //         // Use defensive programming to avoid "not iterable" errors
        //         set((state) => ({
        //             pendingSignals: [...(state.pendingSignals || []), { type: 'ice-candidate', data }]
        //         }));
        //     }
        // });
    },
    // Add message event listeners after setupCallListeners
    setupMessageListeners: () => {
        const { socket } = get();
        console.log('[UserAuthStore] setupMessageListeners called. socket:', socket);
        if (!socket) return;

        // Ensure listeners are not duplicated on reconnect
        socket.off('newMessage');
        socket.off('newGroupMessage');

        // Listen for new messages
        socket.on('newMessage', (message) => {
            console.log('New message received:', message);

            const { selecteduser } = get();
            const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
            const isDirectChatOpen = selecteduser && selecteduser.chatType === 'direct' && selecteduser._id === senderId;

            // Show toast notification only if chat is not open with sender
            if (!isDirectChatOpen) {
                toast.success('New message received!');
            }

            // If chat is open with the sender, add message to current chat
            if (isDirectChatOpen) {
                // Add message to messagestore
                import('./Messagestore').then(module => {
                    const messageStore = module.messagestore.getState();
                    messageStore.addMessage(message);
                });
            }

            // Always trigger unread count update for all contact cards
            window.dispatchEvent(new CustomEvent('updateUnreadCount', {
                detail: { chatType: 'direct', userId: senderId }
            }));

            // If chat is open with the sender, auto mark as read after a small delay
            if (isDirectChatOpen) {
                setTimeout(() => {
                    import('./Messagestore').then(module => {
                        module.messagestore.getState().markread(senderId);
                        // Trigger another update after marking as read
                        window.dispatchEvent(new CustomEvent('updateUnreadCount', {
                            detail: { chatType: 'direct', userId: senderId }
                        }));
                    });
                }, 500);
            }
        });

        socket.on('newGroupMessage', (payload) => {
            const { groupId, message } = payload || {};
            if (!groupId || !message) {
                return;
            }

            const { selecteduser } = get();
            const isGroupChatOpen = selecteduser && selecteduser.chatType === 'group' && selecteduser._id === groupId;

            if (isGroupChatOpen) {
                import('./Messagestore').then(module => {
                    const messageStore = module.messagestore.getState();
                    messageStore.addMessage(message);
                });
            } else {
                toast.success('New group message received!');
            }

            window.dispatchEvent(new CustomEvent('updateUnreadCount', {
                detail: { chatType: 'group', groupId }
            }));
        });
    },

    // --- Socket Monitor ---
    startSocketMonitor: () => {
        if (get().socketMonitorInterval) return; // Prevent multiple intervals
        const interval = setInterval(() => {
            const { socket, connectSocket, user, isSocketConnecting } = get();
            if (user && !isSocketConnecting && (!socket || (!socket.connected && !socket.active))) {
                connectSocket();
            }
        }, 1000);
        set({ socketMonitorInterval: interval });
    },
    stopSocketMonitor: () => {
        const { socketMonitorInterval } = get();
        if (socketMonitorInterval) clearInterval(socketMonitorInterval);
        set({ socketMonitorInterval: null });
    },

    connectSocket: () => {
        const { user, socket: existingSocket } = get()
        console.log('[UserAuthStore] connectSocket called. user:', user);
        if (!user) return;

        if (existingSocket && (existingSocket.connected || existingSocket.active)) {
            return;
        }

        if (existingSocket) {
            existingSocket.off('incoming-call');
            existingSocket.off('call-answered');
            existingSocket.off('call-rejected');
            existingSocket.off('end-call');
            existingSocket.off('call-timeout');
            existingSocket.off('newMessage');
            existingSocket.off('newGroupMessage');
            existingSocket.disconnect();
            set({ socket: null });
        }

        const socket = io(SOCKET_BASE_URL, {
            query: { userId: user._id },
            path: SOCKET_PATH,
            transports: usePollingFallback ? ['polling'] : ['polling', 'websocket'],
            upgrade: !usePollingFallback,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            autoConnect: false,
        });

        set({ socket: socket, isSocketConnecting: true });
        socket.connect();

        socket.on('connect', () => {
            console.log('Socket connected');
            set({
                isSocketConnecting: false,
                socketTransportMode: usePollingFallback ? 'polling' : 'auto',
            });
            get().setupCallListeners();
            get().setupMessageListeners();
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            set({ isSocketConnecting: false });
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log(`Socket reconnect attempt #${attempt}`);
            set({ isSocketConnecting: true });
        });

        socket.on('reconnect_failed', () => {
            console.error('Socket failed to reconnect after maximum attempts');
            set({ isSocketConnecting: false });
            toast.error('Connection lost. Please refresh the page.');
        });

        socket.on('connect_error', (error) => {
            console.error("Socket connection error:", error);
            const description = typeof error?.description === 'string' ? error.description : '';
            const errorText = `${error?.message || ''} ${description}`.toLowerCase();

            if (!usePollingFallback && (errorText.includes('invalid frame header') || errorText.includes('websocket'))) {
                console.warn('[UserAuthStore] WebSocket upgrade failed. Switching socket transport to polling fallback.');
                usePollingFallback = true;

                socket.off('incoming-call');
                socket.off('call-answered');
                socket.off('call-rejected');
                socket.off('end-call');
                socket.off('call-timeout');
                socket.off('newMessage');
                socket.off('newGroupMessage');
                socket.disconnect();

                set({
                    socket: null,
                    isSocketConnecting: false,
                    socketTransportMode: 'polling',
                });

                get().connectSocket();
                return;
            }

            set({ isSocketConnecting: false });
        });

        socket.on('getonline', (userids) => {
            set({ onlineusers: userids })
        });

        // Test response handler
        socket.on('test-response', () => { });
    },
    disconnectSocket: () => {
        console.log('[UserAuthStore] disconnectSocket called.');
        const { socket, stopSocketMonitor } = get();
        if (socket) {
            socket.off('incoming-call');
            socket.off('call-answered');
            socket.off('call-rejected');
            socket.off('end-call');
            socket.off('call-timeout');
            socket.off('newMessage');
            socket.off('newGroupMessage');
            socket.disconnect();
        }
        stopSocketMonitor();
        usePollingFallback = SOCKET_FORCE_POLLING;
        set({
            socket: null,
            isSocketConnecting: false,
            socketTransportMode: SOCKET_FORCE_POLLING ? 'polling' : 'auto',
        });
    },
    login: async (data, navigate) => {
        console.log('[UserAuthStore] login called. data:', data);
        try {
            set({ isloggingin: true })
            const res = await axiosInstance.post("/user/login", data)
            if (res.status === 200) {
                set({ user: res.data.user, hasCheckedAuth: true })
                get().connectSocket()
                get().startSocketMonitor()
                toast.success(res.data.message)
                navigate("/")
            }
        }
        catch (error) {
            if (error?.response?.status === 404) {
                toast.error('API endpoint not found. Set VITE_API_URL to your backend /api URL.');
            } else {
                toast.error(error?.response?.data?.message || "Server Error")
            }
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
                set({ user: res.data.user, hasCheckedAuth: true })
                get().connectSocket()
                get().startSocketMonitor()
                toast.success(res.data.message)
                navigate("/")
            }
        }
        catch (error) {
            if (error?.response?.status === 404) {
                toast.error('API endpoint not found. Set VITE_API_URL to your backend /api URL.');
            } else {
                toast.error(error?.response?.data?.message || "Server Error")
            }
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
            const res = await axiosInstance.get("/user/logout")
            if (res.status === 200) {
                set({ user: null, hasCheckedAuth: true })
                toast.success(res.data.message)
                get().disconnectSocket()
                destroyPeer();
                if (pendingPeerReinitTimeout) {
                    clearTimeout(pendingPeerReinitTimeout);
                    pendingPeerReinitTimeout = null;
                }
                peerReinitAttempts = 0;
                isPeerReinitInProgress = false;
                set({ peer: null, peerId: null, call: null, incomingCall: null, peerCall: null, remoteStream: null, localStream: null });
                navigate("/login")
            }
        }
        catch (error) {
            console.log("error in logging in :", error)
            toast.error(error?.response?.data?.message || "Server Error")
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
            toast.error(error?.response?.data?.message || "Server Error")
        }
        finally {
            set({ isupdatinguser: false })
        }

    },

    checkauth: async () => {
        console.log('[UserAuthStore] checkauth called.');
        const { ischeckingauth, hasCheckedAuth } = get();
        if (ischeckingauth || hasCheckedAuth) {
            return;
        }

        set({ ischeckingauth: true })
        try {




            const res = await axiosInstance.get("/user/check")


            if (res.status === 200) {
                set({ user: res.data.user, hasCheckedAuth: true })
                get().connectSocket()
                get().startSocketMonitor()
            }

        }
        catch (error) {
            set({ user: null })
            if (error?.response?.status === 404) {
                console.warn('checkauth endpoint not found. Configure VITE_API_URL for production.');
            }
            console.log("error in checkauth in :", error)

        }
        finally {
            set({ ischeckingauth: false, hasCheckedAuth: true })
        }

    },

    getusersforsidebar: async () => {
        console.log('[UserAuthStore] getusersforsidebar called.');
        try {
            set({ issettingsidebaruser: true })


            const res = await axiosInstance.get("/user/getusers")

            const users = (res.data.users || []).map((chatUser) => ({
                ...chatUser,
                chatType: 'direct',
            }));

            set({ sidebarusers: users })
        }
        catch (error) {
            console.log(error);

        }
        finally {
            set({ issettingsidebaruser: false })
        }

    },

    getmygroups: async () => {
        console.log('[UserAuthStore] getmygroups called.');
        try {
            set({ isLoadingGroups: true });

            const res = await axiosInstance.get('/group/my');
            const normalizedGroups = (res.data.groups || []).map((group) => ({
                ...group,
                chatType: 'group',
            }));

            set((state) => {
                if (state.selecteduser?.chatType !== 'group') {
                    return { groups: normalizedGroups };
                }

                const refreshedSelectedGroup = normalizedGroups.find((group) => group._id === state.selecteduser._id);
                return {
                    groups: normalizedGroups,
                    selecteduser: refreshedSelectedGroup || null,
                };
            });
        } catch (error) {
            console.log('Error getting groups:', error);
        } finally {
            set({ isLoadingGroups: false });
        }
    },

    createGroup: async ({ name, members }) => {
        try {
            set({ isCreatingGroup: true });

            const res = await axiosInstance.post('/group/create', { name, members });
            get().upsertGroupInState(res.data.group, { select: true });
            set({ searcheduser: null, showCreateGroupPanel: false });

            toast.success(res.data.message || 'Group created successfully');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not create group');
            throw error;
        } finally {
            set({ isCreatingGroup: false });
        }
    },

    renameGroup: async (groupId, name) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.put(`/group/${groupId}/name`, { name });
            get().upsertGroupInState(res.data.group);
            toast.success(res.data.message || 'Group name updated');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not rename group');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    addMembersToGroup: async (groupId, members) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.post(`/group/${groupId}/members`, { members });
            get().upsertGroupInState(res.data.group);
            toast.success(res.data.message || 'Members added');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not add members');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    removeMemberFromGroup: async (groupId, memberId) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.delete(`/group/${groupId}/members/${memberId}`);
            get().upsertGroupInState(res.data.group);
            toast.success(res.data.message || 'Member removed');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not remove member');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    promoteGroupAdmin: async (groupId, memberId) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.post(`/group/${groupId}/admins/${memberId}`);
            get().upsertGroupInState(res.data.group);
            toast.success(res.data.message || 'Member promoted');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not promote admin');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    demoteGroupAdmin: async (groupId, memberId) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.delete(`/group/${groupId}/admins/${memberId}`);
            get().upsertGroupInState(res.data.group);
            toast.success(res.data.message || 'Admin role removed');
            return res.data.group;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not remove admin role');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    leaveGroup: async (groupId) => {
        try {
            set({ isUpdatingGroup: true });
            const res = await axiosInstance.post(`/group/${groupId}/leave`);
            get().removeGroupFromState(groupId, true);
            toast.success(res.data.message || 'You left the group');
            return res.data;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not leave group');
            throw error;
        } finally {
            set({ isUpdatingGroup: false });
        }
    },

    initPeer: (id, options = {}) => {
        console.log('[UserAuthStore] initPeer called. id:', id);
        if (!id) {
            return;
        }

        const { isPeerInitializing, peer: existingPeer } = get();
        if (isPeerInitializing && options.force !== true) {
            return;
        }

        if (
            existingPeer
            && !existingPeer.destroyed
            && existingPeer.id === id
            && !existingPeer.disconnected
        ) {
            return;
        }

        set({ isPeerInitializing: true, isPeerUnavailable: false });
        const peer = createPeer(id); // from your PeerService.js
        set({ peer, peerId: id });

        if (typeof peer.removeAllListeners === 'function') {
            peer.removeAllListeners('open');
            peer.removeAllListeners('error');
            peer.removeAllListeners('call');
            peer.removeAllListeners('disconnected');
            peer.removeAllListeners('close');
        }

        peer.on('open', (pid) => {
            console.log('[UserAuthStore] PeerJS open event. pid:', pid);
            peerReinitAttempts = 0;
            set({ peerId: pid, isPeerInitializing: false, isPeerUnavailable: false });
        });

        const schedulePeerReinit = (reason = 'unknown') => {
            const { user, islogingout } = get();
            if (!user?._id || islogingout || isPeerReinitInProgress) {
                return;
            }

            if (pendingPeerReinitTimeout) {
                return;
            }

            if (peerReinitAttempts >= MAX_PEER_REINIT_ATTEMPTS) {
                set({ isPeerInitializing: false, isPeerUnavailable: true });
                if (peerReinitAttempts === MAX_PEER_REINIT_ATTEMPTS) {
                    toast.error('Video call signaling is unavailable. Please retry in a moment.');
                }
                peerReinitAttempts += 1;
                return;
            }

            const delay = Math.min(1000 * (2 ** peerReinitAttempts), 12000);
            peerReinitAttempts += 1;
            console.warn(`[UserAuthStore] Scheduling peer reinit attempt #${peerReinitAttempts} due to ${reason}`);

            pendingPeerReinitTimeout = setTimeout(() => {
                pendingPeerReinitTimeout = null;
                const currentUser = get().user;
                if (!currentUser?._id) {
                    set({ isPeerInitializing: false });
                    return;
                }

                isPeerReinitInProgress = true;
                try {
                    destroyPeer();
                    set({ peer: null, peerId: null, peerCall: null, isPeerInitializing: false });
                } finally {
                    isPeerReinitInProgress = false;
                }

                get().initPeer(currentUser._id, { force: true });
            }, delay);
        };

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            set({ isPeerInitializing: false });
            if (err?.type === 'network' || err?.type === 'server-error' || err?.type === 'socket-closed') {
                schedulePeerReinit(err?.type);
            }
        });

        peer.on('disconnected', () => {
            if (get().islogingout || isPeerReinitInProgress) {
                return;
            }
            console.warn('[UserAuthStore] Peer disconnected. Reinitializing...');
            set({ isPeerInitializing: false });
            schedulePeerReinit('disconnected');
        });

        peer.on('close', () => {
            if (get().islogingout || isPeerReinitInProgress) {
                return;
            }
            console.warn('[UserAuthStore] Peer closed. Reinitializing...');
            set({ isPeerInitializing: false });
            schedulePeerReinit('close');
        });

        peer.on('call', (callObj) => {
            console.log('[UserAuthStore] PeerJS incoming call event:', callObj);
            const { call } = get();

            if (call) {
                callObj.close();
                return;
            }

            set({
                incomingCall: {
                    signal: callObj,
                    from: callObj.peer,
                    name: callObj.metadata?.name || 'Unknown',
                    profileImg: callObj.metadata?.profileImg || '/avatar.jpg',
                },
                callStatus: 'ringing',
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
