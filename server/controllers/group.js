import Group from '../models/group.js';
import User from '../models/user.js';

function idToString(id) {
    return id?.toString();
}

function isMember(group, userId) {
    return group.members.some((memberId) => idToString(memberId) === idToString(userId));
}

function isAdmin(group, userId) {
    return group.admins.some((adminId) => idToString(adminId) === idToString(userId));
}

async function getPopulatedGroup(groupId) {
    return Group.findById(groupId)
        .populate('members', 'name username profileImg')
        .populate('admins', 'name username profileImg');
}

async function createGroup(req, res) {
    try {
        const { name, members } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Group name is required.' });
        }

        if (!Array.isArray(members)) {
            return res.status(400).json({ success: false, message: 'Members must be an array of user IDs.' });
        }

        const uniqueMembers = [...new Set(members.filter(Boolean).map((memberId) => memberId.toString()))];
        const creatorId = req.user._id.toString();

        if (!uniqueMembers.includes(creatorId)) {
            uniqueMembers.push(creatorId);
        }

        if (uniqueMembers.length < 2) {
            return res.status(400).json({ success: false, message: 'Please select at least one other member.' });
        }

        const existingMembersCount = await User.countDocuments({ _id: { $in: uniqueMembers } });
        if (existingMembersCount !== uniqueMembers.length) {
            return res.status(400).json({ success: false, message: 'One or more selected members are invalid.' });
        }

        const group = await Group.create({
            name: name.trim(),
            members: uniqueMembers,
            admins: [req.user._id],
            createdBy: req.user._id,
        });

        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name username profileImg')
            .populate('admins', 'name username profileImg');

        res.status(201).json({
            success: true,
            message: 'Group created successfully.',
            group: populatedGroup,
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function getMyGroups(req, res) {
    try {
        const groups = await Group.find({ members: req.user._id })
            .sort({ updatedAt: -1 })
            .populate('members', 'name username profileImg')
            .populate('admins', 'name username profileImg');

        res.json({ success: true, groups });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function renameGroup(req, res) {
    try {
        const { groupId } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Group name is required.' });
        }

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (!isAdmin(group, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only admins can rename this group.' });
        }

        group.name = name.trim();
        await group.save();

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, message: 'Group renamed successfully.', group: populatedGroup });
    } catch (error) {
        console.error('Error renaming group:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function addGroupMembers(req, res) {
    try {
        const { groupId } = req.params;
        const { members } = req.body;

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ success: false, message: 'Members array is required.' });
        }

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (!isAdmin(group, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only admins can add members.' });
        }

        const uniqueIncomingMembers = [...new Set(members.filter(Boolean).map((memberId) => memberId.toString()))];
        const existingMemberSet = new Set(group.members.map((memberId) => idToString(memberId)));
        const newMemberIds = uniqueIncomingMembers.filter((memberId) => !existingMemberSet.has(memberId));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No new members selected.' });
        }

        const existingUsers = await User.find({ _id: { $in: newMemberIds } }).select('_id');
        if (existingUsers.length !== newMemberIds.length) {
            return res.status(400).json({ success: false, message: 'One or more members are invalid.' });
        }

        group.members.push(...newMemberIds);
        await group.save();

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, message: 'Members added successfully.', group: populatedGroup });
    } catch (error) {
        console.error('Error adding group members:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function removeGroupMember(req, res) {
    try {
        const { groupId, memberId } = req.params;

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (!isAdmin(group, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only admins can remove members.' });
        }

        if (idToString(memberId) === idToString(req.user._id)) {
            return res.status(400).json({ success: false, message: 'Use leave group to remove yourself.' });
        }

        if (!isMember(group, memberId)) {
            return res.status(404).json({ success: false, message: 'Member not found in this group.' });
        }

        if (group.members.length <= 2) {
            return res.status(400).json({ success: false, message: 'Group must keep at least two members.' });
        }

        group.members = group.members.filter((currentMemberId) => idToString(currentMemberId) !== idToString(memberId));
        group.admins = group.admins.filter((currentAdminId) => idToString(currentAdminId) !== idToString(memberId));

        if (group.admins.length === 0 && group.members.length > 0) {
            group.admins = [group.members[0]];
        }

        await group.save();

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, message: 'Member removed successfully.', group: populatedGroup });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function promoteGroupAdmin(req, res) {
    try {
        const { groupId, memberId } = req.params;

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (!isAdmin(group, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only admins can promote members.' });
        }

        if (!isMember(group, memberId)) {
            return res.status(404).json({ success: false, message: 'Member not found in this group.' });
        }

        if (!isAdmin(group, memberId)) {
            group.admins.push(memberId);
            await group.save();
        }

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, message: 'Member promoted to admin.', group: populatedGroup });
    } catch (error) {
        console.error('Error promoting admin:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function demoteGroupAdmin(req, res) {
    try {
        const { groupId, memberId } = req.params;

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (!isAdmin(group, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only admins can demote admins.' });
        }

        if (!isAdmin(group, memberId)) {
            return res.status(404).json({ success: false, message: 'Target user is not an admin.' });
        }

        if (group.admins.length <= 1) {
            return res.status(400).json({ success: false, message: 'Group must have at least one admin.' });
        }

        group.admins = group.admins.filter((adminId) => idToString(adminId) !== idToString(memberId));
        await group.save();

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, message: 'Admin role removed.', group: populatedGroup });
    } catch (error) {
        console.error('Error demoting admin:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

async function leaveGroup(req, res) {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group || !isMember(group, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        }

        if (group.members.length <= 2) {
            await Group.findByIdAndDelete(groupId);
            return res.json({
                success: true,
                deleted: true,
                message: 'You left the group. Group was removed because only one member would remain.',
                groupId,
            });
        }

        group.members = group.members.filter((memberId) => idToString(memberId) !== idToString(req.user._id));
        const wasAdmin = isAdmin(group, req.user._id);
        group.admins = group.admins.filter((adminId) => idToString(adminId) !== idToString(req.user._id));

        if (wasAdmin && group.admins.length === 0 && group.members.length > 0) {
            group.admins = [group.members[0]];
        }

        await group.save();

        const populatedGroup = await getPopulatedGroup(group._id);
        res.json({ success: true, deleted: false, message: 'You left the group.', group: populatedGroup, groupId });
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

export {
    createGroup,
    getMyGroups,
    renameGroup,
    addGroupMembers,
    removeGroupMember,
    promoteGroupAdmin,
    demoteGroupAdmin,
    leaveGroup,
};