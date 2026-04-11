import express from 'express';
import { checkauth } from '../middlewares/checkauth.js';
import {
	createGroup,
	getMyGroups,
	renameGroup,
	addGroupMembers,
	removeGroupMember,
	promoteGroupAdmin,
	demoteGroupAdmin,
	leaveGroup,
} from '../controllers/group.js';

const router = express.Router();

router.post('/create', checkauth, createGroup);
router.get('/my', checkauth, getMyGroups);
router.put('/:groupId/name', checkauth, renameGroup);
router.post('/:groupId/members', checkauth, addGroupMembers);
router.delete('/:groupId/members/:memberId', checkauth, removeGroupMember);
router.post('/:groupId/admins/:memberId', checkauth, promoteGroupAdmin);
router.delete('/:groupId/admins/:memberId', checkauth, demoteGroupAdmin);
router.post('/:groupId/leave', checkauth, leaveGroup);

export default router;