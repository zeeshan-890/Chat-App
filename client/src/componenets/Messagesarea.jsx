import React, { useEffect, useRef } from 'react'
import "../styles/messagesarea.css"
import { messagestore } from '../Store/Messagestore'
import { userauthstore } from '../Store/UserAuthStore'
import Loader from '../componenets/Loader'


const Messagesarea = () => {

    const { getmessage, messages,  isLoadingMessages } = messagestore()
    const { selecteduser } = userauthstore()
    // const messages = messagestore((state) => state.messages) // ✅ This subscribes correctly
    const scrollRef = useRef(null)
    const prevMsgLengthRef = useRef(0)

    useEffect(() => {

        getmessage(selecteduser._id)
        // listenmessages()


        // return () => unlistenmessages()
    }, [selecteduser._id, getmessage, ])

    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        const prevLength = prevMsgLengthRef.current
        const currentLength = messages.length

        if (currentLength > prevLength) {
            // Only scroll if new message was added
            container.scrollTop = container.scrollHeight
        }

        prevMsgLengthRef.current = currentLength // update for next render
    }, [messages])


    return (

        <div ref={scrollRef} className="messagearea ">
            {isLoadingMessages ? (
                <Loader />
            ) : (
                messages.map(message => (
                    <div key={message._id} className={((message.sender) == selecteduser._id) ? "startchat" : "endchat"}>
                        <p>
                            {message.text}
                        </p>

                    </div>
                ))
            )}
        </div>


    )
}

export default Messagesarea
