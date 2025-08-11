# FullStack Realtime Chat & Video Call App

A full‑stack MERN + Socket.IO + WebRTC application providing:
- User authentication (JWT + HTTP-only cookies)
- Realtime 1:1 messaging with unread counts
- Online user presence
- WebRTC (PeerJS) video calling with ringtone, call states, timers
- Cloudinary image upload for profile avatars
- Responsive React (Vite) frontend with protected routes

---

## Tech Stack

| Layer      | Tech |
|----------- |------|
| Frontend   | React + Vite, Zustand (state), React Router, Socket.IO client, PeerJS |
| Backend    | Node.js, Express, Socket.IO server |
| Database   | MongoDB (Mongoose models: User, Message) |
| Auth       | JWT (stored in HTTP-only cookie) |
| Media      | WebRTC via PeerJS |
| Storage    | Cloudinary (profile images) |
| Styling    | Custom CSS |
| Deployment |  Heroku  |

---

## Folder Structure

```
fullstack/
  client/
    src/
      Store/                # Zustand stores (UserAuthStore, Messagestore)
      services/             # PeerService.js, WebRTC helpers
      componenets/          # UI components (chat, call modal, etc.)
      pages/                # Route pages (Login, Signup, Home, Videocall,updateprofile)
      assets/, public/      # Static assets (avatars, ringtone)
  server/
    index.js                # Express + Socket.IO bootstrap
    services/socket.js      # Socket.IO event wiring (presence, messaging, calls)
    controllers/            # user.js, message.js
    routes/                 # user routes, message routes
    models/                 # User, Message schemas
    middlewares/            # checkauth (protect routes)
    services/cloudinary.js  # Cloudinary config
    services/authentication.js
    public/                 
  .env (NOT COMMITTED)      # Environment variables
```

---

## Main Features (Detailed)

### Authentication
- Signup, Login, Logout
- Persisted session via JWT cookie
- `checkauth` endpoint auto‑restores session on refresh

### Messaging
- Realtime via Socket.IO (`newMessage` event)
- Unread tracking with DOM event trigger (`updateUnreadCount`)
- Lazy adding messages to current open chat

### Presence
- Server emits `getonline` with array of online user IDs
- Client maintains `onlineusers`

### Video Calls (PeerJS + WebRTC)
- Outgoing / Incoming / In‑Call states
- Ringtone handling (`playRingtone`, `stopRingtone`)
- Auto timeout for unanswered calls (15s)
- Call duration + timers
- Clean media stream teardown (`cleanupMediaStreams`)

### Resilience
- Auto socket reconnection every 1s monitor + Socket.IO built‑in retries
- Defensive signal queue (`pendingSignals`) when UI not ready

---

## Environment Variables (.env)

Create a `server/.env` (do NOT commit real secrets):

```
PORT=3000
MONGO_URL=mongodb+srv://<user>:<password>@cluster/<db>?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
TWILIO_ACCOUNT_SID=your_twilio_sid            # (If actually used; optional)
TWILIO_AUTH_TOKEN=your_twilio_auth_token      # (If actually used; optional)
```

Important:
- Remove any stray line without `=` (e.g. a lone `TWILIO_AUTH_TOKEN` breaks parsing).
- Never commit real credentials.

---

## Installation

### 1. Clone
```
git clone <repo-url>
cd fullstack
```

### 2. Install Dependencies
```
cd server
npm install
cd ../client
npm install
```

### 3. Run Development
Backend (port 3000 default):
```
cd server
npm run dev   # or: node index.js / nodemon
```
Frontend (Vite, defaults to 5173):
```
cd client
npm run dev
```

Visit: http://localhost:5173

Proxy: If API base differs, configure Vite proxy or use absolute URL in AxiosInstance.

---

## Build & Production

Frontend:
```
cd client
npm run build
```
Serve `/client/dist` via:
- Express static (configure `server/index.js`) OR
- Separate static host (Netlify, etc.)

Ensure:
```
const BASE_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:3000'
  : '/';
```
In production behind same origin, Socket.IO mounts at `/socket.io`.

---

## Socket / Realtime Architecture

Client:
- `UserAuthStore.connectSocket()` initializes socket with `query: { userId }`
- Listeners registered: presence (`getonline`), messaging (`newMessage`), call events (`incoming-call`, `call-answered`, etc.)
- `startSocketMonitor()` interval (1s) re‑invokes `connectSocket` if missing/disconnected.

Server (expected flow):
- On connection: register user ID, broadcast online list
- On disconnect: remove user, broadcast updated online list
- Relay events: `call-user`, `answer-call`, `call-rejected`, `end-call`, `newMessage`

---

## WebRTC Flow (Simplified)

1. Caller selects user → emits `call-user`
2. Callee receives `incoming-call` → UI modal + ringtone
3. Callee answers → emit `answer-call`
4. PeerJS handles media streams; store updates timers
5. Either ends → emit `end-call` + cleanup streams

---

## State Management (Zustand)

Key store modules:
- `UserAuthStore`: auth, socket lifecycle, calls, presence
- `Messagestore`: message list per selected user (lazy loaded)
Patterns:
- Minimal re-renders by grouping state
- Defensive checks (listener duplication prevention)

---

## Axios & Auth

`AxiosInstance`:
- Base URL conditional on environment
- Credentials (cookie) should be enabled if server uses cookies:
  (If not already) `axios.create({ withCredentials: true, ... })`

Ensure CORS on server allows:
```
origin: <frontend-origin>
credentials: true
```

---


---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Invalid frame header (WebSocket) | Proxy / Heroku not handling upgrade properly | Enable WebSockets, ensure single HTTP server instance used |
| Repeated listeners / duplicate toasts | Multiple `connectSocket` calls | Guard: `if (get().socket?.connected) return` |
| Ringtone not playing | Browser autoplay policy | First user gesture primes audio (`playRingtone(true)`) |
| Call never ends after no answer | `startCallTimeout` not firing | Ensure call state `type: 'outgoing'` is set before timeout |
| Stale online list | Missing broadcast on disconnect | Verify server removes user on `disconnect` and emits list |
| Media not released | Streams not stopped | `cleanupMediaStreams()` ensures track.stop() on end |

---

## Security Notes

- NEVER commit `.env` or real secrets
- Regenerate compromised keys immediately
- Validate and sanitize all message inputs server-side
- Consider rate limiting auth & messaging endpoints

---

## Potential Enhancements

- Message pagination + search
- Group chats
- Delivery/read receipts (per message)
- Typing indicators
- STUN/TURN server for NAT traversal (e.g. use public Google STUN, add TURN for reliability)
- Dark mode / theming
- Unit tests (Jest) + integration tests

---



## API (High-Level)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /user/sign-up | POST | Register user |
| /user/login | POST | Login |
| /user/logout | GET | Logout |
| /user/check | GET | Restore session |
| /user/update | POST | Update profile |
| /user/getusers | GET | Sidebar list |
| /message/... | GET/POST | Send / fetch messages |

(See controllers for specifics.)

---

## Environment Hardening Checklist

- Set `NODE_ENV=production` in production
- Enable HTTPS (reverse proxy / platform)
- Set secure cookie flags (httpOnly, secure, sameSite)
- Add helmet middleware for security headers
- Add request size limits & validation

---



## Disclaimer

Secrets shown during development should be rotated before any public deployment.

---

## Author / Ownership

zeeshan-890