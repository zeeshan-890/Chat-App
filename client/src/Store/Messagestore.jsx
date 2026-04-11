import { create } from 'zustand'
import axiosInstance from './AxiosInstance'
import toast from 'react-hot-toast'
export const messagestore = create((set, get) => ({

    messages: [],
    unreadmessage: null,
    isLoadingMessages: false,
    isSendingMessage: false,

    isLoadingUnread: false,
    isMarkingRead: false,

    sendmessage: async (data, selectedChat) => {
        if (!selectedChat?._id) {
            return;
        }

        set({ isSendingMessage: true });
        try {
            const payload = { text: data.text };

            const res = selectedChat.chatType === 'group'
                ? await axiosInstance.post('/message/group/send', {
                    ...payload,
                    groupId: selectedChat._id,
                })
                : await axiosInstance.post('/message/send', {
                    ...payload,
                    receiver: selectedChat._id,
                });

            const msg = res.data.data
            set({ messages: [...get().messages, msg] })
        }
        catch (error) {
            toast.error(error?.response?.data?.message || 'Could not send message');
            console.log(error);
        } finally {
            set({ isSendingMessage: false });
        }
    },

    getmessage: async (selectedChat) => {
        if (!selectedChat?._id) {
            set({ messages: [] });
            return;
        }

        set({ isLoadingMessages: true });
        try {
            const res = selectedChat.chatType === 'group'
                ? await axiosInstance.get(`/message/group/${selectedChat._id}`)
                : await axiosInstance.get(`/message/get/${selectedChat._id}`)

            set({ messages: res.data.messages })
        }
        catch (e) {
            console.log(e);
        }
        finally {
            set({ isLoadingMessages: false });
        }
    },

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