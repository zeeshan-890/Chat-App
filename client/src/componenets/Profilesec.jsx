import React, { useState, useEffect, useRef } from 'react'
import "../styles/profilesec.css"
import { RiMenuLine } from "react-icons/ri";
import { MdLogout } from 'react-icons/md';
import { userauthstore } from '../Store/UserAuthStore';
import { useNavigate } from 'react-router-dom';
import Loader from './Loader';

const Profilesec = () => {

    const navigate = useNavigate()

    const { logout, user, islogingout } = userauthstore()

    const [btns, setshowbtns] = useState(false)
    const menuref = useRef(null);
    // const menuref = useRef()

    useEffect(() => {
        const handleClick = (event) => {
            if (!menuref.current.contains(event.target)) {
                setshowbtns(false);
            }
        }



        window.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('click', handleClick); // Cleanup on unmount
        };
    }, []);


    function shownmenu() {
        setshowbtns(!btns)
    }

    async function handlelogout() {

        logout(navigate);

    }



    const disp = { display: btns ? "flex" : "none" }


    return (
        <div className="profilcard"  >
            <div className="profiledata">
                <div className="profilimg">
                    <img src={user.profileImg || "/avatar.jpg"} alt="profile" />
                </div>
                <div className="profilenames">
                    <div className="profilename">{user.name}</div>
                    <div className="profileusername">{user.username}</div>
                </div>
            </div>
            <div className="menu" ref={menuref}>
                <div className="menuicon" onClick={shownmenu}>
                    <RiMenuLine size={25} />
                </div>
                <div className="menubtns" style={disp}>
                    <div className="editbtn" onClick={() => navigate("/editprofile")}> Edit Profile</div>
                    <div className="editbtn" onClick={() => navigate("/documents")}>📄 Documents</div>
                    <div className="logoutbtn" >
                        <button onClick={handlelogout} disabled={islogingout}>
                            {islogingout ? <Loader /> : "Logout"}
                        </button>
                    </div>
                </div>
            </div>
        </div>

    )
}

export default Profilesec

