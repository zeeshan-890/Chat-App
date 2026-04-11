import React, { useEffect, useRef } from 'react'
import "../styles/messagesarea.css"
import { messagestore } from '../Store/Messagestore'
import { userauthstore } from '../Store/UserAuthStore'
import Loader from '../componenets/Loader'


const Messagesarea = () => {

    const { getmessage, messages, isLoadingMessages } = messagestore()
    const { selecteduser, user } = userauthstore()
    // const messages = messagestore((state) => state.messages) // ✅ This subscribes correctly
    const scrollRef = useRef(null)
    const prevMsgLengthRef = useRef(0)

    useEffect(() => {

        getmessage(selecteduser)
        // listenmessages()


        // return () => unlistenmessages()
    }, [selecteduser?._id, selecteduser?.chatType, getmessage])

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
                messages.map(message => {
                    const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender
                    const isOwnMessage = senderId === user?._id
                    const isGroupMessage = selecteduser?.chatType === 'group'

                    return (
                    <div key={message._id} className={isOwnMessage ? "endchat" : "startchat"}>
                        <p>
                            {isGroupMessage && !isOwnMessage && typeof message.sender === 'object' && (
                                <span className="sendername">{message.sender.name}</span>
                            )}
                            {message.text || 'Media message'}
                        </p>

                    </div>
                )})
            )}
        </div>


    )
}

export default Messagesarea
