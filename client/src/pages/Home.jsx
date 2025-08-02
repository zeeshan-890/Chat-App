import React, { useEffect } from 'react'


import Leftsidebar from '../componenets/Leftsidebar';

import Welcomechat from '../componenets/Welcomechat';
import { userauthstore } from '../Store/UserAuthStore';
import Mainchat from '../componenets/Mainchat';
import IncomingCallModal from '../componenets/IncomingCallModal';
import axiosInstance from '../Store/AxiosInstance';


const Home = () => {

    const { setselecteduser, selecteduser, user, peer, initPeer } = userauthstore()

    useEffect(() => {
        setselecteduser(null)
    }, [])

    useEffect(() => {
        if (user && !peer) {
            initPeer(user._id);
        }
    }, [user, peer, initPeer]);

    // const handleGetIceServers = async () => {
    //     try {
    //         console.log('Fetching ICE servers...');
    //         const response = await axiosInstance.get('/ice');
    //         const data = response.data;
    //         console.log('ICE Servers:', data);
    //     } catch (error) {
    //         console.error('Error fetching ICE servers:', error);
    //     }
    // };



    return (
        <div className='signupbody'>
            {/* <button onClick={handleGetIceServers}>Get ICE Servers</button> */}
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
