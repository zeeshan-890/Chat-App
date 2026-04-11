import React, { useState } from 'react'
import "../styles/searchchats.css"
import { FaSearch } from "react-icons/fa"
import { userauthstore } from '../Store/UserAuthStore'
import Loader from './Loader'

const SearchChats = () => {
  const [value, setValue] = useState("")
  const { sidebarusers, groups, setsearcheduser, issettingsidebaruser, isLoadingGroups } = userauthstore()

  const handleSubmit = (e) => {
    e.preventDefault()
    const query = value.trim().toLowerCase()

    if (!query) {
      setsearcheduser(null)
      return
    }

    const chats = [...(groups || []), ...(sidebarusers || [])]
    const matchedChats = chats.filter((chat) => {
      const name = (chat.name || '').toLowerCase()
      const username = (chat.username || '').toLowerCase()
      return name.includes(query) || username.includes(query)
    })

    setsearcheduser(matchedChats)
    setValue("")
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
          <button disabled={!(value.length > 0)} type='submit'>{issettingsidebaruser || isLoadingGroups ? <Loader className="small" /> : <FaSearch />}</button>
        </label>
      </form>
    </div>
  )
}

export default SearchChats

