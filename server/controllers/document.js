import Document from '../models/document.js';
import crypto from 'crypto';

// Create new document
async function createDocument(req, res) {
    try {
        const { title } = req.body;

        const document = await Document.create({
            title: title || 'Untitled Document',
            owner: req.user._id,
            lastEditedBy: req.user._id
        });

        res.status(201).json({ success: true, document });
    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get user's own documents
async function getMyDocuments(req, res) {
    try {
        const documents = await Document.find({ owner: req.user._id })
            .sort({ updatedAt: -1 })
            .select('title createdAt updatedAt');

        res.json({ success: true, documents });
    } catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get documents shared with user
async function getSharedDocuments(req, res) {
    try {
        const documents = await Document.find({
            'collaborators.user': req.user._id
        })
            .populate('owner', 'name profileImg')
            .sort({ updatedAt: -1 })
            .select('title owner createdAt updatedAt collaborators');

        res.json({ success: true, documents });
    } catch (error) {
        console.error('Error getting shared documents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get single document by ID
async function getDocument(req, res) {
    try {
        const document = await Document.findById(req.params.id)
            .populate('owner', 'name profileImg')
            .populate('collaborators.user', 'name profileImg');

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Check access permissions
        const isOwner = document.owner._id.toString() === req.user._id.toString();
        const isCollaborator = document.collaborators.some(
            c => c.user._id.toString() === req.user._id.toString()
        );

        if (!isOwner && !isCollaborator && !document.isPublic) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Determine user's permission level
        let permission = 'view';
        if (isOwner) {
            permission = 'owner';
        } else if (isCollaborator) {
            const collab = document.collaborators.find(
                c => c.user._id.toString() === req.user._id.toString()
            );
            permission = collab.permission;
        }

        res.json({ success: true, document, permission });
    } catch (error) {
        console.error('Error getting document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Update document title
async function updateDocument(req, res) {
    try {
        const { title } = req.body;

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Check if user is owner or has edit permission
        const isOwner = document.owner.toString() === req.user._id.toString();
        const hasEditPermission = document.collaborators.some(
            c => c.user.toString() === req.user._id.toString() && c.permission === 'edit'
        );

        if (!isOwner && !hasEditPermission) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        document.title = title;
        document.lastEditedBy = req.user._id;
        document.lastEditedAt = new Date();
        await document.save();

        res.json({ success: true, document });
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Delete document (owner only)
async function deleteDocument(req, res) {
    try {
        const document = await Document.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found or access denied' });
        }

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Generate share link for document
async function shareDocument(req, res) {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Generate unique share link if not exists
        if (!document.shareLink) {
            document.shareLink = crypto.randomBytes(16).toString('hex');
        }
        document.isPublic = true;
        await document.save();

        res.json({ success: true, shareLink: document.shareLink });
    } catch (error) {
        console.error('Error sharing document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Add collaborator to document
async function addCollaborator(req, res) {
    try {
        const { userId, permission } = req.body;

        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Check if user is already a collaborator
        const existingCollab = document.collaborators.find(
            c => c.user.toString() === userId
        );

        if (existingCollab) {
            existingCollab.permission = permission || 'view';
        } else {
            document.collaborators.push({
                user: userId,
                permission: permission || 'view'
            });
        }

        await document.save();

        const updatedDoc = await Document.findById(document._id)
            .populate('collaborators.user', 'name profileImg');

        res.json({ success: true, document: updatedDoc });
    } catch (error) {
        console.error('Error adding collaborator:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Update collaborator permission
async function updateCollaboratorPermission(req, res) {
    try {
        const { permission } = req.body;
        const { userId } = req.params;

        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const collaborator = document.collaborators.find(
            c => c.user.toString() === userId
        );

        if (!collaborator) {
            return res.status(404).json({ success: false, message: 'Collaborator not found' });
        }

        collaborator.permission = permission;
        await document.save();

        res.json({ success: true, message: 'Permission updated' });
    } catch (error) {
        console.error('Error updating collaborator:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Remove collaborator from document
async function removeCollaborator(req, res) {
    try {
        const { userId } = req.params;

        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        document.collaborators = document.collaborators.filter(
            c => c.user.toString() !== userId
        );
        await document.save();

        res.json({ success: true, message: 'Collaborator removed' });
    } catch (error) {
        console.error('Error removing collaborator:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get document by share link (public access)
async function getDocumentByShareLink(req, res) {
    try {
        const { shareLink } = req.params;

        const document = await Document.findOne({ shareLink, isPublic: true })
            .populate('owner', 'name profileImg');

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.json({ success: true, document, permission: 'view' });
    } catch (error) {
        console.error('Error getting shared document:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export {
    createDocument,
    getMyDocuments,
    getSharedDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
    getDocumentByShareLink
};
