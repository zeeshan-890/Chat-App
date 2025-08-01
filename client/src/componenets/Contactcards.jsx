import { messagestore } from "../Store/Messagestore"
import { userauthstore } from "../Store/UserAuthStore"

import { useEffect, useState } from "react"
import "../styles/contactcard.css"
import Loader from './Loader'


const Contactcards = (props) => {
    const { setselecteduser, onlineusers, selecteduser } = userauthstore()
    const { getunread, markread, isLoadingUnread } = messagestore()

    const user = props.user
    const [unreadCount, setUnreadCount] = useState(0)
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchUnread = async () => {
        if (isUpdating) return; // Prevent multiple simultaneous updates
        setIsUpdating(true);
        try {
            const count = await getunread(user._id)
            setUnreadCount(count)
        } catch (error) {
            console.error('Error fetching unread count:', error);
        } finally {
            setIsUpdating(false);
        }
    }

    useEffect(() => {
        fetchUnread()
    }, [user._id])

    // Listen for live unread count updates with debouncing
    useEffect(() => {
        let timeoutId;

        const handleUnreadUpdate = (event) => {
            if (event.detail.userId === user._id) {
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
    }, [user._id]);

    // Reset unread count when this user is selected
    useEffect(() => {
        if (selecteduser && selecteduser._id === user._id) {
            setUnreadCount(0);
        }
    }, [selecteduser, user._id]);

    const handleCardClick = async () => {
        setselecteduser(user);
        await markread(user._id);
        setUnreadCount(0);
    }

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`profilecard${selecteduser && selecteduser._id === user._id ? ' selected' : ''}`}
                style={{
                    pointerEvents: isLoadingUnread || isUpdating ? 'none' : 'auto',
                    opacity: isLoadingUnread || isUpdating ? 0.6 : 1
                }}
            >
                <div className="profiledata">
                    <div className="profileimg">
                        <img src={props.profileImg} alt="profile" />
                        <div className={onlineusers.includes(user._id) ? "statusdot" : ""}></div>
                    </div>
                    <div className="profilenames">
                        <div className="profilename">{props.name}</div>
                        <div className="latestmsg">{user.username}</div>
                    </div>
                </div>
                <div className="menu">
                    <div className="menuicon">
                        {!isLoadingUnread && !isUpdating && <div className={`noti ${(unreadCount <= 0) && "nonoti"}`}>{unreadCount}</div>}
                    </div>
                </div>
            </div>
        </>

    )
}

export default Contactcards



