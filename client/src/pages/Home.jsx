import React, { useEffect } from 'react'


import Leftsidebar from '../componenets/Leftsidebar';

import Welcomechat from '../componenets/Welcomechat';
import { userauthstore } from '../Store/UserAuthStore';
import Mainchat from '../componenets/Mainchat';
import IncomingCallModal from '../componenets/IncomingCallModal';


const Home = () => {

    const { setselecteduser, selecteduser } = userauthstore()

    useEffect(() => {
        setselecteduser(null)
    }, [])

    return (
        <div className='signupbody'>
            <IncomingCallModal />
            
            <div className="homesec">
                {/* Show Left Sidebar only if screen is large or no user selected */}
                <div className={`leftside ${selecteduser ? 'hide-on-mobile' : ''}`}>
                    <Leftsidebar />
                </div>

                {/* Show right side only if screen is large or user is selected */}
                <div className={`rightside ${!selecteduser ? 'hide-on-mobile' : ''}`}>
                    {selecteduser ? <Mainchat /> : <Welcomechat />}
                </div>
            </div>
        </div>
    );
}

export default Home
