import { create } from 'zustand'
import axiosInstance from './AxiosInstance'
import { userauthstore } from './UserAuthStore'
import { BiLogIn } from 'react-icons/bi'
import toast from 'react-hot-toast'
// import toast from 'react-hot-toast'




export const messagestore = create((set, get) => ({

    messages: [],
    unreadmessage: null,
    isLoadingMessages: false,
    isSendingMessage: false,

    isLoadingUnread: false,
    isMarkingRead: false,

    sendmessage: async (data, id) => {
        set({ isSendingMessage: true });
        try {
            const res = await axiosInstance.post("/message/send", {
                text: data.text, receiver: id
            });
            const msg = res.data.data
            console.log(msg);

            // set({...get().messages , msg})
            set({ messages: [...get().messages, msg] })
            // Optionally update messages here if needed
        } finally {
            set({ isSendingMessage: false });
        }
    },
    getmessage: async (id) => {
        set({ isLoadingMessages: true });
        try {
            const res = await axiosInstance.get(`/message/get/${id}`)
            set({ messages: res.data.messages })
            console.log(get().messages);

        }
        catch (e) {
            console.log(e);

        }
        finally {
            set({ isLoadingMessages: false });
        }
    },

    listenmessages: () => {

        // const selecteduser = userauthstore().getstate().selecteduser
        // const socket = userauthstore().getstate().socket
        const selecteduser = userauthstore.getState().selecteduser
        const socket = userauthstore.getState().socket

        if (!socket) return;
        if (!socket) return;

        // Remove existing listener to prevent duplicates
        socket.off('newMessage');

        // Listen for new messages
        // socket.on('newMessage', (message) => {
        //     console.log('New message received:', message); // Debug log

        //     toast.success('New message received!');
        //     const { selecteduser } = get();

        //     // // Show toast notification only if chat is not open with sender
        //     // if (!selecteduser || selecteduser._id !== message.sender) {
        //     //     toast.success('New message received!');
        //     // }

        //     // Always trigger unread count update for all contact cards first
        //     window.dispatchEvent(new CustomEvent('updateUnreadCount', {
        //         detail: { userId: message.sender }
        //     }))
        // });

        if (!selecteduser) return;
        socket.off('newMessage'); // Clean up previous
        socket.on('newMessage', (message) => {
            set({ messages: [...get().messages, message] })
        })

    }
    ,
    // unlistenmessages: () => {
    //     // const socket = userauthstore().getstate().socket
    //     const socket = userauthstore.getState().socket
    //     socket.off('newMessage')
    // },
     addMessage: (message) => {
        set({ messages: [...get().messages, message] });
    },

    getunread: async (userid) => {
        set({ isLoadingUnread: true });
        try {
            const res = await axiosInstance.get(`/message/getunread/${userid}`)
            return res.data.unreadmessages
        } finally {
            set({ isLoadingUnread: false });
        }
    },
    markread: async (userid) => {
        set({ isMarkingRead: true });
        try {
            await axiosInstance.get(`/message/markread/${userid}`)
        } finally {
            set({ isMarkingRead: false });
        }
    }
}))