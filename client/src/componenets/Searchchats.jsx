import React, { useState } from 'react'
import "../styles/searchchats.css"
import { FaSearch } from "react-icons/fa"
import { userauthstore } from '../Store/UserAuthStore'
import Loader from './Loader'

const SearchChats = () => {
  const [value, setValue] = useState("")
  const { sidebarusers, setsearcheduser, issettingsidebaruser } = userauthstore()

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Searching for:", value)

    const matchedUsers = sidebarusers.filter(user =>
      user.name.toLowerCase().includes(value.toLowerCase())
    )
    console.log("Matched Users:", matchedUsers)
    setsearcheduser(matchedUsers)
    setValue("")
    // You can now call a search function or update filtered chat list
  }

  return (
    <div className='searching'>
      <form onSubmit={handleSubmit}>
        <label htmlFor="search">
          <input
            value={value}
            type="text"
            id='search'
            placeholder='Search chats'
            onChange={(e) => setValue(e.target.value)}
          />
          <button  disabled = {!(value.length>0)} type='submit'>{issettingsidebaruser ? <Loader className="small" /> : <FaSearch />}</button>
        </label>
      </form>
    </div>
  )
}

export default SearchChats

