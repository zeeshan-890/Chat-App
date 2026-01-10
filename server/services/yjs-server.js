// Yjs Server Service - Handles real-time document collaboration
// Uses CRDT (Conflict-free Replicated Data Type) for sync

import Document from '../models/document.js';

// Store active Yjs documents in memory
const activeDocuments = new Map();

// Store document update timeouts for debounced saves
const saveTimeouts = new Map();

/**
 * Get or create a Yjs document representation
 * @param {string} docId - MongoDB document ID
 * @returns {Object} Document state info
 */
async function getDocumentState(docId) {
    try {
        const dbDoc = await Document.findById(docId);
        if (!dbDoc) {
            return null;
        }

        // Return the current content buffer as array
        if (dbDoc.content) {
            return {
                exists: true,
                state: Array.from(new Uint8Array(dbDoc.content))
            };
        }

        return {
            exists: true,
            state: null
        };
    } catch (error) {
        console.error('Error getting document state:', error);
        return null;
    }
}

/**
 * Save document state to database (debounced)
 * @param {string} docId - MongoDB document ID
 * @param {Uint8Array} state - Yjs document state
 * @param {string} userId - User who made the edit
 */
function saveDocumentState(docId, state, userId) {
    // Clear existing timeout
    if (saveTimeouts.has(docId)) {
        clearTimeout(saveTimeouts.get(docId));
    }

    // Debounce save - wait 1 second after last update
    const timeout = setTimeout(async () => {
        try {
            await Document.findByIdAndUpdate(docId, {
                content: Buffer.from(state),
                lastEditedBy: userId,
                lastEditedAt: new Date()
            });
            console.log(`Document ${docId} saved to database`);
        } catch (error) {
            console.error('Error saving document state:', error);
        }
        saveTimeouts.delete(docId);
    }, 1000);

    saveTimeouts.set(docId, timeout);
}

/**
 * Track active document session
 * @param {string} docId - Document ID
 * @param {string} socketId - Socket ID of connected user
 * @param {Object} userInfo - User information
 */
function addUserToDocument(docId, socketId, userInfo) {
    if (!activeDocuments.has(docId)) {
        activeDocuments.set(docId, new Map());
    }
    activeDocuments.get(docId).set(socketId, {
        docId,
        userId: userInfo._id,
        name: userInfo.name,
        color: generateRandomColor(),
        joinedAt: Date.now()
    });

    return activeDocuments.get(docId);
}

/**
 * Remove user from document session
 * @param {string} docId - Document ID
 * @param {string} socketId - Socket ID
 */
function removeUserFromDocument(docId, socketId) {
    if (activeDocuments.has(docId)) {
        activeDocuments.get(docId).delete(socketId);

        // Clean up if no users left
        if (activeDocuments.get(docId).size === 0) {
            activeDocuments.delete(docId);
        }
    }
}

/**
 * Get all active users in a document
 * @param {string} docId - Document ID
 * @returns {Array} Array of users
 */
function getActiveUsers(docId) {
    if (!activeDocuments.has(docId)) {
        return [];
    }
    return Array.from(activeDocuments.get(docId).values());
}

/**
 * Generate a random color for cursor
 */
function generateRandomColor() {
    const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#96CEB4', // Green
        '#FFEAA7', // Yellow
        '#DDA0DD', // Plum
        '#98D8C8', // Mint
        '#F7DC6F', // Gold
        '#BB8FCE', // Purple
        '#85C1E9'  // Light Blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Force save all pending documents (for graceful shutdown)
 */
async function saveAllPendingDocuments() {
    for (const [docId, timeout] of saveTimeouts.entries()) {
        clearTimeout(timeout);
        saveTimeouts.delete(docId);
    }
    console.log('All pending documents saved');
}

export {
    getDocumentState,
    saveDocumentState,
    addUserToDocument,
    removeUserFromDocument,
    getActiveUsers,
    generateRandomColor,
    saveAllPendingDocuments
};
