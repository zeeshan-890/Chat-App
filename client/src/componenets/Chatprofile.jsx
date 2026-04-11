import React, { useEffect, useMemo, useState } from 'react'
import { userauthstore } from '../Store/UserAuthStore'
import { IoArrowBackSharp } from "react-icons/io5";
import { FaVideo } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const Chatprofile = () => {
    const navigate = useNavigate()
    const {
        selecteduser,
        setselecteduser,
        onlineusers,
        startCall,
        user,
        sidebarusers,
        renameGroup,
        addMembersToGroup,
        removeMemberFromGroup,
        promoteGroupAdmin,
        demoteGroupAdmin,
        leaveGroup,
        isUpdatingGroup,
    } = userauthstore()

    const isGroupChat = selecteduser?.chatType === 'group'
    const [showGroupManage, setShowGroupManage] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [pendingMembers, setPendingMembers] = useState([])

    useEffect(() => {
        if (isGroupChat) {
            setNewGroupName(selecteduser?.name || '')
            setPendingMembers([])
        } else {
            setShowGroupManage(false)
            setPendingMembers([])
            setNewGroupName('')
        }
    }, [isGroupChat, selecteduser?.name])

    const memberIds = useMemo(() => new Set((selecteduser?.members || []).map((member) => (
        typeof member === 'object' ? member._id : member
    ))), [selecteduser?.members])

    const adminIds = useMemo(() => new Set((selecteduser?.admins || []).map((admin) => (
        typeof admin === 'object' ? admin._id : admin
    ))), [selecteduser?.admins])

    const isCurrentUserAdmin = isGroupChat && adminIds.has(user?._id)

    const availableUsersToAdd = useMemo(() => {
        if (!isGroupChat) {
            return []
        }

        return (sidebarusers || []).filter((chatUser) => !memberIds.has(chatUser._id))
    }, [isGroupChat, sidebarusers, memberIds])

    async function handleback() {
        setselecteduser(null)
        setShowGroupManage(false)
    }

    function handlevideo() {
        if (isGroupChat) {
            return;
        }

        // Always allow video call button to work, let the backend handle offline detection
        startCall(selecteduser)
        navigate('/videocall')
    }

    const handleTogglePendingMember = (memberId) => {
        setPendingMembers((prev) => (
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        ))
    }

    const handleRenameGroup = async (event) => {
        event.preventDefault()
        const normalizedName = newGroupName.trim()

        if (!normalizedName || normalizedName === selecteduser.name) {
            return
        }

        try {
            await renameGroup(selecteduser._id, normalizedName)
        } catch (error) {
            console.log('Could not rename group:', error)
        }
    }

    const handleAddMembers = async (event) => {
        event.preventDefault()

        if (pendingMembers.length === 0) {
            return
        }

        try {
            await addMembersToGroup(selecteduser._id, pendingMembers)
            setPendingMembers([])
        } catch (error) {
            console.log('Could not add members:', error)
        }
    }

    const handlePromote = async (memberId) => {
        try {
            await promoteGroupAdmin(selecteduser._id, memberId)
        } catch (error) {
            console.log('Could not promote admin:', error)
        }
    }

    const handleDemote = async (memberId) => {
        try {
            await demoteGroupAdmin(selecteduser._id, memberId)
        } catch (error) {
            console.log('Could not demote admin:', error)
        }
    }

    const handleRemoveMember = async (memberId) => {
        try {
            await removeMemberFromGroup(selecteduser._id, memberId)
        } catch (error) {
            console.log('Could not remove member:', error)
        }
    }

    const handleLeaveGroup = async () => {
        const shouldLeave = window.confirm('Are you sure you want to leave this group?')
        if (!shouldLeave) {
            return
        }

        try {
            await leaveGroup(selecteduser._id)
            setShowGroupManage(false)
        } catch (error) {
            console.log('Could not leave group:', error)
        }
    }

    return (
        <>
            <div className="profilcard">
                <div className="profiledata">
                    <div onClick={handleback} className="backicon"><IoArrowBackSharp /></div>
                    <div className="profilimg">
                        <img src={isGroupChat ? (selecteduser.groupImg || "/avatar.jpg") : (selecteduser.profileImg || "/avatar.jpg")} alt="profile" />
                    </div>
                    <div className="profilenames">
                        <div className="profilename">{selecteduser.name}</div>
                        <div className="profileusername">
                            {isGroupChat
                                ? `${selecteduser.members?.length || 0} members`
                                : (onlineusers.includes(selecteduser._id) ? "Online" : "Offline")}
                        </div>
                    </div>
                </div>
                {!isGroupChat && (
                    <div className='menu'>
                        <button
                            onClick={handlevideo}
                            style={{
                                opacity: 1,
                                cursor: 'pointer'
                            }}
                            title="Start video call"
                        >
                            <FaVideo size={20} border="none" />
                        </button>
                    </div>
                )}

                {isGroupChat && (
                    <div className='groupmenuactions'>
                        <button
                            type="button"
                            className="groupmanagebtn"
                            onClick={() => setShowGroupManage((prev) => !prev)}
                        >
                            {showGroupManage ? 'Close' : 'Manage'}
                        </button>
                        <button
                            type="button"
                            className="leavegroupbtn"
                            onClick={handleLeaveGroup}
                            disabled={isUpdatingGroup}
                        >
                            Leave
                        </button>
                    </div>
                )}
            </div>

            {isGroupChat && showGroupManage && (
                <div className="groupmanagepanel">
                    {isCurrentUserAdmin && (
                        <>
                            <form className="groupsection" onSubmit={handleRenameGroup}>
                                <p className="groupsectiontitle">Rename Group</p>
                                <div className="groupinlineform">
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(event) => setNewGroupName(event.target.value)}
                                        placeholder="Group name"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isUpdatingGroup || !newGroupName.trim() || newGroupName.trim() === selecteduser.name}
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>

                            <form className="groupsection" onSubmit={handleAddMembers}>
                                <p className="groupsectiontitle">Add Members</p>
                                {availableUsersToAdd.length > 0 ? (
                                    <div className="groupmemberspicklist">
                                        {availableUsersToAdd.map((chatUser) => (
                                            <label key={chatUser._id} className="grouppickitem">
                                                <input
                                                    type="checkbox"
                                                    checked={pendingMembers.includes(chatUser._id)}
                                                    onChange={() => handleTogglePendingMember(chatUser._id)}
                                                />
                                                <span>{chatUser.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="groupemptynote">All users are already in this group.</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isUpdatingGroup || pendingMembers.length === 0}
                                >
                                    Add Selected
                                </button>
                            </form>
                        </>
                    )}

                    <div className="groupsection">
                        <p className="groupsectiontitle">Members</p>
                        <div className="groupmemberslistview">
                            {(selecteduser.members || []).map((member) => {
                                const memberId = typeof member === 'object' ? member._id : member
                                const memberName = typeof member === 'object' ? member.name : memberId
                                const isAdminMember = adminIds.has(memberId)
                                const isSelf = memberId === user?._id

                                return (
                                    <div key={memberId} className="groupmemberrow">
                                        <div className="groupmembermeta">
                                            <span className="groupmembername">{memberName}</span>
                                            <span className="groupmemberbadges">
                                                {isAdminMember ? 'Admin' : 'Member'}
                                                {isSelf ? ' • You' : ''}
                                            </span>
                                        </div>

                                        {isCurrentUserAdmin && !isSelf && (
                                            <div className="groupmemberactions">
                                                {!isAdminMember && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePromote(memberId)}
                                                        disabled={isUpdatingGroup}
                                                    >
                                                        Make Admin
                                                    </button>
                                                )}

                                                {isAdminMember && (selecteduser.admins?.length || 0) > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDemote(memberId)}
                                                        disabled={isUpdatingGroup}
                                                    >
                                                        Remove Admin
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="dangerbtn"
                                                    onClick={() => handleRemoveMember(memberId)}
                                                    disabled={isUpdatingGroup}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

        </>
    )
}

export default Chatprofile
