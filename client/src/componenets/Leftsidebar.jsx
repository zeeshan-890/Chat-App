import React, { useEffect } from 'react'
import Profilesec from './Profilesec'
import Contactcards from './Contactcards'
import "../styles/leftsidebar.css"
import Searchchats from './Searchchats'
import { userauthstore } from '../Store/UserAuthStore'
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import Loader from './Loader';


const Leftsidebar = () => {
  const { getusersforsidebar, sidebarusers, isettingsidebaruser, searcheduser, setsearcheduser } = userauthstore()

  useEffect(() => {

    getusersforsidebar();
  }, [getusersforsidebar]);

  return (
    <>
      <div className="leftsidebar1">
        <div className="profileesec">
          <Profilesec />
        </div>

        <div className='searchbar'>
          <Searchchats />
        </div>

        <div className="messagecards">
          {isettingsidebaruser ? (
            <Loader />
          ) : searcheduser && searcheduser.length > 0 ? (

            <>
              <div className="back-button">
                <button onClick={() => { setsearcheduser(null) }}><MdOutlineKeyboardBackspace size={30} /></button>
              </div>
              {searcheduser.map(user => (
                <Contactcards
                  key={user._id}
                  id={user._id}
                  user={user}
                  name={user.name}
                  profileImg={user.profileImg || "/src/assets/avatar.jpg"}
                />
              ))}
            </>
          ) : sidebarusers && sidebarusers.length > 0 ? (
            sidebarusers.map(user => (
              <Contactcards
                key={user._id}
                user={user}
                name={user.name}
                profileImg={user.profileImg || "/src/assets/avatar.jpg"}
              />
            ))
          ) : (
            <div>No users found.</div>
          )}
        </div>
      </div>
    </>
  )



}

export default Leftsidebar
