import React from 'react'
import Sendmessage from './Sendmessage'
import Messagesarea from './Messagesarea'
import Chatprofile from './Chatprofile'

const Mainchat = () => {
    return (
        <div className='mainchatbox'>
            <div className="chatprof">
            <Chatprofile />
            </div>
            <div className="messagebo">
            <Messagesarea />
            </div>
            <div className="sendmsg">
            <Sendmessage />
            </div>
        </div>
    )
}

export default Mainchat
