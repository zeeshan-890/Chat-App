import { create } from 'zustand'
import axiosInstance from './AxiosInstance'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

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
    pendingSignals: [], // Store signals that arrive before component is ready
    callStatus: null, // 'ringing' | 'connected' | 'ended' | 'offline'
    callTimeout: null, // Timeout for auto-ending calls
    ringtone: null, // Audio element for ringtone

    setIncomingCall: (data) => {
        set({ incomingCall: data });
        get().playRingtone();
    },
    setselecteduser: (data) => {
        set({ selecteduser: data })
    },

    setsearcheduser: (data) => {
        set({ searcheduser: data })
    },

    // Process pending signals when component is ready
    processPendingSignals: () => {
        const { pendingSignals } = get();
        pendingSignals.forEach(signal => {
            if (signal.type === 'incoming-call' && window.handleIncomingCallSignal && signal.data.signal) {
                window.handleIncomingCallSignal(signal.data.signal);
            } else if (signal.type === 'call-answered' && window.handleCallAnsweredSignal && signal.data.signal) {
                window.handleCallAnsweredSignal(signal.data.signal);
            } else if (signal.type === 'ice-candidate' && window.handleIceCandidateSignal && signal.data.candidate) {
                window.handleIceCandidateSignal(signal.data.candidate);
            }
        });
        set({ pendingSignals: [] });
    },

    // Start auto-end timer for outgoing calls
    startCallTimeout: () => {
        const { call } = get();
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
        let { ringtone } = get();
        if (!ringtone) {
            ringtone = new window.Audio('/ringtone.mp3');
            ringtone.loop = true;
            ringtone.volume = 0.7;
            set({ ringtone });
        }
        try {
            ringtone.currentTime = 0;
            const playPromise = ringtone.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    if (prime) {
                        ringtone.pause();
                    }
                }).catch((err) => {
                    console.error('Could not play ringtone:', err);
                });
            }
        } catch (err) {
            console.error('Could not play ringtone:', err);
        }
    },

    stopRingtone: () => {
        const { ringtone } = get();
        if (ringtone) {
            ringtone.pause();
            ringtone.currentTime = 0;
        }
    },

    // Call actions
    startCall: (callee) => {
        const { user, onlineusers } = get()
        if (!user || !callee) return;

        // Check if user is online and show warning but still allow call
        if (!onlineusers.includes(callee._id)) {
            toast.error(`${callee.name} appears to be offline, but you can still try calling`);
        }

        // Don't emit call-user here - the Videocall component will handle WebRTC signaling
        set({
            call: { type: 'outgoing', user: callee, started: Date.now() },
            callTimer: 0,
            callStatus: 'ringing'
        });
    },
    answerCall: (signal, from) => {
        // Stop ringtone when call is answered
        get().stopRingtone();

        // Don't emit answer-call here - the Videocall component will handle WebRTC signaling
        set({
            call: { type: 'in-call', user: { _id: from }, started: Date.now() },
            incomingCall: null,
            callTimer: 0,
            callDuration: 0,
            callStatus: 'connected'
        });
    },
    rejectCall: (from) => {
        // Stop ringtone when call is rejected
        get().stopRingtone();

        const { socket } = get();
        if (!socket) return;
        socket.emit('call-rejected', { to: from });
        set({ incomingCall: null, call: null });
    },
    endCall: (to) => {
        // Stop ringtone when call ends
        get().stopRingtone();

        const { socket, callTimeout, callDurationInterval } = get();
        if (socket && to) socket.emit('end-call', { to });

        // Clear timeout if exists
        if (callTimeout) {
            clearTimeout(callTimeout);
        }

        // Clear duration interval if exists
        if (callDurationInterval) {
            clearInterval(callDurationInterval);
        }


        set({
            call: null,
            callTimer: 0,
            callDuration: 0,
            callStatus: null,
            callTimeout: null,
            callDurationInterval: null
        });
    },
    // Call timer logic
    startCallTimer: () => {
        const interval = setInterval(() => {
            set((state) => ({ callTimer: state.callTimer + 1 }));
        }, 1000);
        set({ callInterval: interval });
    },
    stopCallTimer: () => {
        const { callInterval } = get();
        if (callInterval) clearInterval(callInterval);
        set({ callInterval: null, callTimer: 0 });
    },
    // Socket event listeners for call signaling
    setupCallListeners: () => {
        const { socket } = get();
        if (!socket) {
            return;
        }

        // Incoming call
        socket.on('incoming-call', (data) => {
            set({ incomingCall: data });
            get().playRingtone();

            // If we're in a video call component, process the signal
            if (window.handleIncomingCallSignal && data.signal) {
                window.handleIncomingCallSignal(data.signal);
            } else {
                // Store the signal for when the component is ready
                set((state) => ({
                    pendingSignals: [...state.pendingSignals, { type: 'incoming-call', data }]
                }));
            }
        });

        // Call answered
        socket.on('call-answered', (data) => {
            set((state) => ({
                call: { ...state.call, type: 'in-call' },
                callStatus: 'connected'
            }));

            // Clear timeout since call was answered
            const { callTimeout } = get();
            if (callTimeout) {
                clearTimeout(callTimeout);
                set({ callTimeout: null });
            }

            // If we're in a video call component, process the signal
            if (window.handleCallAnsweredSignal && data.signal) {
                window.handleCallAnsweredSignal(data.signal);
            } else {
                // Store the answer for when the component is ready
                set((state) => ({
                    pendingSignals: [...state.pendingSignals, { type: 'call-answered', data }]
                }));
            }
        });

        // Call rejected
        socket.on('call-rejected', () => {
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
                callDurationInterval: null
            });
            toast.error('Call was rejected');
        });

        // End call
        socket.on('end-call', () => {
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
                callDurationInterval: null
            });
            toast('Call ended');
        });

        // ICE candidate
        socket.on('ice-candidate', (data) => {

            // If we're in a video call component, process the candidate
            if (window.handleIceCandidateSignal && data.candidate) {
                window.handleIceCandidateSignal(data.candidate);
            } else {
                // Store the candidate for when the component is ready
                set((state) => ({
                    pendingSignals: [...state.pendingSignals, { type: 'ice-candidate', data }]
                }));
            }
        });
    },
    // Add message event listeners after setupCallListeners
    setupMessageListeners: () => {
        const { socket } = get();
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
        const { socket } = get();
        if (socket?.connected) {
            socket.off('newMessage'); // Clean up message listeners
            socket.disconnect();
        }
        set({ socket: null });
    },
    login: async (data, navigate) => {
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

    }

}))