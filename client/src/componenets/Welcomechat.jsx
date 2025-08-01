import React from 'react'
import "../styles/welcomechat.css"
const Welcomechat = () => {
  return (
    <div className="mainbox">
      <div className="secondbox">
        <div className="chatimage">
          <img src="/chat.png" alt="" />
        </div>
        <div className="chattext">
          Welcome to Chat
        </div>
      </div>
    </div>
  )
}

export default Welcomechat