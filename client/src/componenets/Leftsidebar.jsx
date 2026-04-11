import React, { useEffect, useMemo, useState } from 'react'
import Profilesec from './Profilesec'
import Contactcards from './Contactcards'
import "../styles/leftsidebar.css"
import Searchchats from './Searchchats'
import { userauthstore } from '../Store/UserAuthStore'
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import Loader from './Loader';


const Leftsidebar = () => {
  const {
    getusersforsidebar,
    getmygroups,
    sidebarusers,
    groups,
    issettingsidebaruser,
    isLoadingGroups,
    searcheduser,
    setsearcheduser,
    createGroup,
    isCreatingGroup,
    showCreateGroupPanel,
    toggleCreateGroupPanel,
    closeCreateGroupPanel,
  } = userauthstore()

  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    getusersforsidebar();
    getmygroups();
  }, [getusersforsidebar, getmygroups]);

  const allChats = useMemo(() => {
    const safeGroups = Array.isArray(groups) ? groups : [];
    const safeUsers = Array.isArray(sidebarusers) ? sidebarusers : [];
    return [...safeGroups, ...safeUsers];
  }, [groups, sidebarusers]);

  const isSearching = Array.isArray(searcheduser);
  const listToRender = isSearching ? searcheduser : allChats;
  const isLoading = issettingsidebaruser || isLoadingGroups;

  const toggleMember = (userId) => {
    setSelectedMembers((prev) => (
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    ));
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (!groupName.trim() || selectedMembers.length < 1) {
      return;
    }

    try {
      await createGroup({
        name: groupName.trim(),
        members: selectedMembers,
      });
      setGroupName('');
      setSelectedMembers([]);
      closeCreateGroupPanel();
    } catch (error) {
      console.log('Create group failed:', error);
    }
  };

  return (
    <>
      <div className="leftsidebar1">
        <div className="profileesec">
          <Profilesec />
        </div>

        <div className='searchbar'>
          <Searchchats />
        </div>

        <div className="groupactions">
          <button
            type="button"
            className="new-group-btn"
            onClick={toggleCreateGroupPanel}
          >
            {showCreateGroupPanel ? 'Close Group Form' : 'Create Group'}
          </button>
        </div>

        {showCreateGroupPanel && (
          <form className="creategrouppanel" onSubmit={handleCreateGroup}>
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />

            <div className="groupmemberslist">
              {sidebarusers.map((chatUser) => (
                <label key={chatUser._id} className="groupmemberitem">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(chatUser._id)}
                    onChange={() => toggleMember(chatUser._id)}
                  />
                  <span>{chatUser.name}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="create-group-submit"
              disabled={isCreatingGroup || !groupName.trim() || selectedMembers.length < 1}
            >
              {isCreatingGroup ? 'Creating...' : 'Create'}
            </button>
          </form>
        )}

        <div className="messagecards">
          {isLoading ? (
            <Loader />
          ) : isSearching ? (

            <>
              <div className="back-button">
                <button onClick={() => { setsearcheduser(null) }}><MdOutlineKeyboardBackspace size={30} /></button>
              </div>
              {listToRender.length > 0 ? (
                listToRender.map((chat) => (
                  <Contactcards
                    key={`${chat.chatType}-${chat._id}`}
                    chat={chat}
                  />
                ))
              ) : (
                <div className="emptylistmsg">No chats found for this search.</div>
              )}
            </>
          ) : listToRender.length > 0 ? (
            listToRender.map((chat) => (
              <Contactcards
                key={`${chat.chatType}-${chat._id}`}
                chat={chat}
              />
            ))
          ) : (
            <div className="emptylistmsg">No chats found.</div>
          )}
        </div>
      </div>
    </>
  )



}

export default Leftsidebar
