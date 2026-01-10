import express from 'express';
import { checkauth } from '../middlewares/checkauth.js';
import {
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
} from '../controllers/document.js';

const router = express.Router();

// Document CRUD operations
router.post('/create', checkauth, createDocument);
router.get('/my-documents', checkauth, getMyDocuments);
router.get('/shared-with-me', checkauth, getSharedDocuments);
router.get('/:id', checkauth, getDocument);
router.put('/:id', checkauth, updateDocument);
router.delete('/:id', checkauth, deleteDocument);

// Sharing and collaboration
router.post('/:id/share', checkauth, shareDocument);
router.post('/:id/collaborator', checkauth, addCollaborator);
router.put('/:id/collaborator/:userId', checkauth, updateCollaboratorPermission);
router.delete('/:id/collaborator/:userId', checkauth, removeCollaborator);

// Public access via share link
router.get('/public/:shareLink', getDocumentByShareLink);

export default router;
