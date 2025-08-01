import React from 'react'
import { useForm } from "react-hook-form"
import { userauthstore } from '../Store/UserAuthStore'
import { messagestore } from '../Store/Messagestore'
import "../styles/sendmessage.css"
import Loader from '../componenets/Loader'

const Sendmessage = () => {

    const {
        register,
        handleSubmit,
        reset,
        watch,
        // formState: { errors },
    } = useForm()

    const { selecteduser } = userauthstore()
    const { sendmessage, isSendingMessage } = messagestore()
    const receiverid = selecteduser._id

    const onSubmit = (data) => {

        sendmessage(data, receiverid);
        reset(); // Optional: clear input after sending
    };


    return (
        <div className='sendmessagebox'>
            <form onSubmit={handleSubmit(onSubmit)}>
                <input type="text" placeholder="Enter your Message" {...register("text")} />
                <button type='submit' disabled={(isSendingMessage) || !watch("text")}>{isSendingMessage ? <Loader /> : "send"}</button>
            </form>
        </div>
    )
}

export default Sendmessage
