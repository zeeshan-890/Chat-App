import React from 'react'
import { userauthstore } from '../Store/UserAuthStore'
import { IoArrowBackSharp } from "react-icons/io5";
import { FaVideo } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { messagestore } from '../Store/Messagestore';
// import { markread } from '../../../server/controllers/message';




const Chatprofile = () => {
    const navigate = useNavigate()
    const { selecteduser, setselecteduser, onlineusers, startCall } = userauthstore()
    const { markread } = messagestore()
    async function handleback() {
        // await markread(selecteduser._id) // Mark messages as read when going back
        setselecteduser(null)
    }

    function handlevideo() {
        // Always allow video call button to work, let the backend handle offline detection
        startCall(selecteduser)
        navigate('/videocall')
    }
    return (
        <div className="profilcard">
            <div className="profiledata">
                <div onClick={handleback} className="backicon"><IoArrowBackSharp /></div>
                <div className="profilimg">
                    <img src={selecteduser.profileImg || "/avatar.jpg"} alt="profile" />
                </div>
                <div className="profilenames">
                    <div className="profilename">{selecteduser.name}</div>
                    <div className="profileusername">{onlineusers.includes(selecteduser._id) ? "Online" : "Offline"}</div>
                </div>
            </div>
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
        </div>
    )
}

export default Chatprofile
