import { messagestore } from "../Store/Messagestore"
import { userauthstore } from "../Store/UserAuthStore"

import { useEffect, useState } from "react"
import "../styles/contactcard.css"

const Contactcards = (props) => {
    const { setselecteduser, onlineusers, selecteduser } = userauthstore()
    const { getunread, markread, isLoadingUnread } = messagestore()

    const chat = props.chat || props.user
    const isGroup = chat?.chatType === 'group'
    const [unreadCount, setUnreadCount] = useState(0)
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchUnread = async () => {
        if (isGroup) {
            setUnreadCount(0)
            return
        }

        if (isUpdating) return; // Prevent multiple simultaneous updates
        setIsUpdating(true);
        try {
            const count = await getunread(chat._id)
            setUnreadCount(count)
        } catch (error) {
            console.error('Error fetching unread count:', error);
        } finally {
            setIsUpdating(false);
        }
    }

    useEffect(() => {
        fetchUnread()
    }, [chat._id, isGroup])

    // Listen for live unread count updates with debouncing
    useEffect(() => {
        if (isGroup) {
            return;
        }

        let timeoutId;

        const handleUnreadUpdate = (event) => {
            if (event.detail?.chatType === 'direct' && event.detail.userId === chat._id) {
                // Debounce the update to prevent multiple rapid calls
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    fetchUnread();
                }, 100);
            }
        };

        window.addEventListener('updateUnreadCount', handleUnreadUpdate);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('updateUnreadCount', handleUnreadUpdate);
        };
    }, [chat._id, isGroup]);

    // Reset unread count when this user is selected
    useEffect(() => {
        if (selecteduser && selecteduser._id === chat._id && selecteduser.chatType === chat.chatType) {
            setUnreadCount(0);
        }
    }, [selecteduser, chat._id, chat.chatType]);

    const handleCardClick = async () => {
        setselecteduser(chat);
        if (!isGroup) {
            await markread(chat._id);
        }
        setUnreadCount(0);
    }

    const cardName = chat.name
    const cardSubtitle = isGroup ? `${chat.members?.length || 0} members` : chat.username
    const cardImage = isGroup ? (chat.groupImg || "/avatar.jpg") : (chat.profileImg || "/avatar.jpg")
    const isSelected = selecteduser && selecteduser._id === chat._id && selecteduser.chatType === chat.chatType
    const isDisabled = !isGroup && (isLoadingUnread || isUpdating)

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`profilecard${isSelected ? ' selected' : ''}`}
                style={{
                    pointerEvents: isDisabled ? 'none' : 'auto',
                    opacity: isDisabled ? 0.6 : 1
                }}
            >
                <div className="profiledata">
                    <div className="profileimg">
                        <img src={cardImage} alt="profile" />
                        {!isGroup && <div className={onlineusers.includes(chat._id) ? "statusdot" : ""}></div>}
                    </div>
                    <div className="profilenames">
                        <div className="profilename">{cardName}</div>
                        <div className="latestmsg">{cardSubtitle}</div>
                    </div>
                </div>
                <div className="menu">
                    <div className="menuicon">
                        {!isGroup && !isLoadingUnread && !isUpdating && <div className={`noti ${(unreadCount <= 0) && "nonoti"}`}>{unreadCount}</div>}
                    </div>
                </div>
            </div>
        </>

    )
}

export default Contactcards



