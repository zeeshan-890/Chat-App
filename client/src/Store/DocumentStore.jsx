import { create } from 'zustand';
import axiosInstance from './AxiosInstance';
import toast from 'react-hot-toast';

export const documentstore = create((set, get) => ({
    documents: [],
    sharedDocuments: [],
    currentDocument: null,
    isLoading: false,
    isCreating: false,
    isDeleting: false,

    // Fetch user's own documents
    getMyDocuments: async () => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get('/document/my-documents');
            set({ documents: res.data.documents });
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to load documents');
        } finally {
            set({ isLoading: false });
        }
    },

    // Fetch documents shared with user
    getSharedDocuments: async () => {
        try {
            const res = await axiosInstance.get('/document/shared-with-me');
            set({ sharedDocuments: res.data.documents });
        } catch (error) {
            console.error('Error fetching shared documents:', error);
        }
    },

    // Create new document
    createDocument: async (title = 'Untitled Document') => {
        set({ isCreating: true });
        try {
            const res = await axiosInstance.post('/document/create', { title });
            const newDoc = res.data.document;
            set({ documents: [newDoc, ...get().documents] });
            toast.success('Document created!');
            return newDoc;
        } catch (error) {
            console.error('Error creating document:', error);
            toast.error('Failed to create document');
            return null;
        } finally {
            set({ isCreating: false });
        }
    },

    // Get single document by ID
    getDocument: async (id) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get(`/document/${id}`);
            set({ currentDocument: res.data.document });
            return { document: res.data.document, permission: res.data.permission };
        } catch (error) {
            console.error('Error fetching document:', error);
            toast.error('Failed to load document');
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    // Update document title
    updateDocumentTitle: async (id, title) => {
        try {
            await axiosInstance.put(`/document/${id}`, { title });

            // Update local state
            set({
                documents: get().documents.map(d =>
                    d._id === id ? { ...d, title } : d
                ),
                currentDocument: get().currentDocument?._id === id
                    ? { ...get().currentDocument, title }
                    : get().currentDocument
            });
        } catch (error) {
            console.error('Error updating title:', error);
            toast.error('Failed to update title');
        }
    },

    // Delete document
    deleteDocument: async (id) => {
        set({ isDeleting: true });
        try {
            await axiosInstance.delete(`/document/${id}`);
            set({ documents: get().documents.filter(d => d._id !== id) });
            toast.success('Document deleted');
            return true;
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Failed to delete document');
            return false;
        } finally {
            set({ isDeleting: false });
        }
    },

    // Share document and get link
    shareDocument: async (id) => {
        try {
            const res = await axiosInstance.post(`/document/${id}/share`);
            toast.success('Share link created!');
            return res.data.shareLink;
        } catch (error) {
            console.error('Error sharing document:', error);
            toast.error('Failed to create share link');
            return null;
        }
    },

    // Add collaborator
    addCollaborator: async (docId, userId, permission = 'view') => {
        try {
            const res = await axiosInstance.post(`/document/${docId}/collaborator`, {
                userId,
                permission
            });
            toast.success('Collaborator added!');
            return res.data.document;
        } catch (error) {
            console.error('Error adding collaborator:', error);
            toast.error('Failed to add collaborator');
            return null;
        }
    },

    // Remove collaborator
    removeCollaborator: async (docId, userId) => {
        try {
            await axiosInstance.delete(`/document/${docId}/collaborator/${userId}`);
            toast.success('Collaborator removed');
            return true;
        } catch (error) {
            console.error('Error removing collaborator:', error);
            toast.error('Failed to remove collaborator');
            return false;
        }
    },

    // Clear current document
    clearCurrentDocument: () => {
        set({ currentDocument: null });
    }
}));
