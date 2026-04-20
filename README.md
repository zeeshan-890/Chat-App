# FullStack Realtime Chat & Video Call App

A production-ready full‑stack MERN + Socket.IO + WebRTC application providing real-time communication features:

- **User Authentication** — JWT-based with HTTP-only cookies for security
- **Real-time 1:1 Messaging** — Instant delivery with unread message counts
- **Online Presence** — Live user status indicators
- **WebRTC Video Calling** — Peer-to-peer video calls with ringtone, call states, and duration timers
- **Profile Management** — Cloudinary-powered image upload for avatars
- **Responsive Design** — Mobile-friendly React (Vite) frontend with protected routes

🌐 **Live Demo:** [https://converza.app.zeeshan-abbas.tech](https://converza.app.zeeshan-abbas.tech)

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Socket Events](#socket-events)
- [WebRTC Flow](#webrtc-flow)
- [State Management](#state-management)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | Fast, modern UI with hot module replacement |
| **State Management** | Zustand | Lightweight, performant global state |
| **Routing** | React Router v6 | Client-side navigation with protected routes |
| **Real-time (Client)** | Socket.IO Client | WebSocket communication |
| **Video Calls** | PeerJS | WebRTC abstraction for peer-to-peer video |
| **HTTP Client** | Axios | API requests with credentials |
| **Backend** | Node.js + Express | RESTful API server |
| **Real-time (Server)** | Socket.IO Server | WebSocket event handling |
| **Database** | MongoDB + Mongoose | Document-based data storage |
| **Authentication** | JWT | Stateless auth with HTTP-only cookies |
| **File Storage** | Cloudinary | Cloud-based image hosting |
| **ICE Servers** | Twilio (optional) | TURN/STUN servers for NAT traversal |
| **Styling** | Custom CSS | Component-scoped styles |
| **Deployment** | CapRover / Docker | Containerized production deployment |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Zustand   │  │  Socket.IO  │  │        PeerJS           │  │
│  │   Stores    │  │   Client    │  │   (WebRTC Wrapper)      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          │ HTTP/REST      │ WebSocket           │ WebRTC (P2P)
          │                │                     │
┌─────────┼────────────────┼─────────────────────┼────────────────┐
│         ▼                ▼                     │                │
│  ┌─────────────┐  ┌─────────────┐              │                │
│  │   Express   │  │  Socket.IO  │              │                │
│  │   Routes    │  │   Server    │◄─────────────┘                │
│  └──────┬──────┘  └──────┬──────┘                               │
│         │                │                                      │
│         ▼                ▼                                      │
│  ┌─────────────────────────────┐  ┌──────────────────────────┐  │
│  │      MongoDB (Mongoose)     │  │   PeerJS Server (Relay)  │  │
│  │   - Users                   │  │   - Signaling only       │  │
│  │   - Messages                │  └──────────────────────────┘  │
│  └─────────────────────────────┘                               │
│                         SERVER (Node.js)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
fullstack/
├── captain-definition          # CapRover deployment config
├── Dockerfile                  # Multi-stage Docker build
├── .dockerignore               # Docker build exclusions
├── package.json                # Root package (scripts only)
├── README.md                   # This file
│
├── client/                     # React Frontend
│   ├── index.html              # Entry HTML
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── eslint.config.js        # Linting rules
│   │
│   ├── public/
│   │   └── sounds/             # Audio assets (ringtones)
│   │
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Root component with routes
│       ├── App.css             # Global styles
│       ├── index.css           # Base styles
│       │
│       ├── assets/             # Static images, icons
│       │
│       ├── componenets/        # Reusable UI components
│       │   ├── Chatprofile.jsx       # Chat header with user info
│       │   ├── Contactcards.jsx      # Sidebar contact list items
│       │   ├── IncomingCallModal.jsx # Call notification modal
│       │   ├── Leftsidebar.jsx       # Main sidebar container
│       │   ├── Loader.jsx            # Loading spinner
│       │   ├── Mainchat.jsx          # Chat area container
│       │   ├── Messagesarea.jsx      # Message display area
│       │   ├── Profilesec.jsx        # User profile section
│       │   ├── Protectedroute.jsx    # Auth route wrapper
│       │   ├── Searchchats.jsx       # Contact search
│       │   ├── Sendmessage.jsx       # Message input form
│       │   └── Welcomechat.jsx       # Empty state placeholder
│       │
│       ├── pages/              # Route-level components
│       │   ├── Home.jsx              # Main app page
│       │   ├── Login.jsx             # Login form
│       │   ├── Signup.jsx            # Registration form
│       │   ├── Updateprofile.jsx     # Profile edit page
│       │   └── Videocall.jsx         # Video call interface
│       │
│       ├── Routes/
│       │   └── approutes.jsx         # Route definitions
│       │
│       ├── services/           # External service integrations
│       │   ├── PeerService.js        # PeerJS configuration
│       │   └── WebRTCService.jsx     # WebRTC helper functions
│       │
│       ├── Store/              # Zustand state management
│       │   ├── AxiosInstance.jsx     # Configured Axios client
│       │   ├── Messagestore.jsx      # Message state & actions
│       │   └── UserAuthStore.jsx     # Auth, socket, call state
│       │
│       ├── styles/             # Component-specific CSS
│       │   ├── contactcard.css
│       │   ├── incomingCallModal.css
│       │   ├── leftsidebar.css
│       │   ├── messagesarea.css
│       │   ├── profilesec.css
│       │   ├── searchchats.css
│       │   ├── sendmessage.css
│       │   ├── signup.css
│       │   ├── updateprofile.css
│       │   ├── videoCallPage.css
│       │   └── welcomechat.css
│       │
│       └── utils/
│           └── ringtone.js           # Audio playback utilities
│
└── server/                     # Node.js Backend
    ├── index.js                # Express app entry + Socket.IO setup
    ├── package.json            # Backend dependencies
    │
    ├── controllers/            # Request handlers
    │   ├── user.js                   # Auth & user CRUD
    │   └── message.js                # Messaging logic
    │
    ├── middlewares/
    │   └── checkauth.js              # JWT verification middleware
    │
    ├── models/                 # Mongoose schemas
    │   ├── user.js                   # User model
    │   └── message.js                # Message model
    │
    ├── routes/                 # API route definitions
    │   ├── user.js                   # /api/user routes
    │   └── message.js                # /api/message routes
    │
    ├── services/
    │   ├── socket.js                 # Socket.IO event handlers
    │   ├── authentication.js         # JWT utilities
    │   └── cloudinary.js             # Cloudinary configuration
    │
    └── public/                 # Static file serving (if needed)
```

---

## ✨ Features

### 🔐 Authentication System
| Feature | Description |
|---------|-------------|
| **User Registration** | Email/password signup with validation |
| **Secure Login** | JWT token stored in HTTP-only cookie (XSS protection) |
| **Session Persistence** | Auto-restore session on page refresh via `/api/user/check` |
| **Logout** | Cookie cleared server-side |
| **Protected Routes** | `Protectedroute` component guards authenticated pages |

### 💬 Real-time Messaging
| Feature | Description |
|---------|-------------|
| **Instant Delivery** | Messages sent via Socket.IO (`newMessage` event) |
| **Message History** | Lazy-loaded from MongoDB per conversation |
| **Unread Counts** | Badge updates via `updateUnreadCount` DOM event |
| **Optimistic UI** | Messages appear instantly before server confirmation |

### 👥 Online Presence
| Feature | Description |
|---------|-------------|
| **Live Status** | Green dot indicator for online users |
| **Real-time Updates** | Server broadcasts `getonline` with current user list |
| **Disconnect Detection** | Users removed from list on socket disconnect |

### 📹 Video Calling (WebRTC)
| Feature | Description |
|---------|-------------|
| **Peer-to-Peer** | Direct video/audio via PeerJS (WebRTC wrapper) |
| **Call States** | Idle → Outgoing → Incoming → In-Call → Ended |
| **Ringtone** | Audio notification for incoming calls |
| **Call Timer** | Duration display during active calls |
| **Auto-Timeout** | Unanswered calls end after 15 seconds |
| **Stream Cleanup** | Proper media track release on call end |
| **ICE Servers** | Twilio TURN/STUN for NAT traversal (optional) |

### 👤 Profile Management
| Feature | Description |
|---------|-------------|
| **Avatar Upload** | Cloudinary-hosted profile images |
| **Profile Update** | Change display name and avatar |

### 🔄 Connection Resilience
| Feature | Description |
|---------|-------------|
| **Auto-Reconnect** | Socket.IO built-in + custom 1-second monitor |
| **Signal Queuing** | `pendingSignals` buffer when UI not ready |
| **Error Recovery** | Graceful handling of connection drops |

---

## 📋 Prerequisites

Before installation, ensure you have:

- **Node.js** v18.x or higher (v22 recommended)
- **npm** v9.x or higher
- **MongoDB** Atlas account or local instance
- **Cloudinary** account (free tier works)
- **Twilio** account (optional, for TURN servers)
- **Git** for version control

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/zeeshan-890/Chat-App.git
cd Chat-App
```

### 2. Install Backend Dependencies
```bash
cd server
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../client
npm install
```

### 4. Configure Environment Variables
See [Environment Variables](#environment-variables) section below.

---

## 🔑 Environment Variables

Create `server/.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
Mongo_Url=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_long_random_secret_key_at_least_32_characters

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio ICE Servers (Optional - for better video call connectivity)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

Create `client/.env` file only when frontend and backend are deployed on different origins:

```env
# Optional frontend endpoint overrides
VITE_API_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
VITE_SOCKET_PATH=/socket.io
# Optional: defaults to true in production for proxy compatibility.
# Set to false only when websocket upgrades are fully supported.
VITE_SOCKET_FORCE_POLLING=true
VITE_PEER_URL=https://your-api-domain.com
VITE_PEER_PATH=/peerjs
```

### ⚠️ Important Notes:
- **Never commit `.env` files** — They're in `.gitignore`
- **No spaces around `=`** — `KEY=value` not `KEY = value`
- **Generate strong JWT secret**: `openssl rand -base64 32`
- **Rotate compromised credentials immediately**

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 — Backend (Port 3000):**
```bash
cd server
npm run dev    # or: node index.js
```

**Terminal 2 — Frontend (Port 5173):**
```bash
cd client
npm run dev
```

**Access the app:** http://localhost:5173

### Production Build

```bash
# Build frontend
cd client
npm run build

# Start server (serves built frontend)
cd ../server
NODE_ENV=production node index.js
```

---

## 🐳 Deployment

### Docker / CapRover Deployment

This project includes Docker configuration for easy deployment to CapRover or any Docker-compatible platform.

#### Files Included:
- `captain-definition` — CapRover entry point
- `Dockerfile` — Multi-stage build (frontend + backend)
- `.dockerignore` — Excludes unnecessary files

#### Deploy to CapRover:

1. **Create App** in CapRover dashboard
2. **Enable WebSocket Support** (App Configs → Enable WebSocket)
3. **Add Environment Variables** in App Configs:
   ```
   Mongo_Url=<your_mongodb_url>
   PORT=3000
   JWT_SECRET=<your_secret>
   CLOUDINARY_CLOUD_NAME=<name>
   CLOUDINARY_API_KEY=<key>
   CLOUDINARY_API_SECRET=<secret>
   NODE_ENV=production
   TWILIO_ACCOUNT_SID=<sid>        # Optional
   TWILIO_AUTH_TOKEN=<token>       # Optional
   ```
4. **Deploy** via:
   - GitHub integration (auto-deploy on push)
   - `caprover deploy` CLI
   - Tarball upload

#### Manual Docker Build:
```bash
docker build -t chat-app .
docker run -p 3000:3000 --env-file server/.env chat-app
```

---

## 📡 API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/user/sign-up` | Register new user | No |
| `POST` | `/api/user/login` | Login user | No |
| `GET` | `/api/user/logout` | Logout user | Yes |
| `GET` | `/api/user/check` | Verify session | Yes |
| `POST` | `/api/user/update` | Update profile | Yes |
| `GET` | `/api/user/getusers` | Get all users | Yes |

### Messaging Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/message/:userId` | Get messages with user | Yes |
| `POST` | `/api/message/send/:userId` | Send message to user | Yes |

### Utility Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/ice` | Get Twilio ICE servers | No |

### Request/Response Examples

<details>
<summary><strong>POST /api/user/sign-up</strong></summary>

**Request:**
```json
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com"
  }
}
```
</details>

<details>
<summary><strong>POST /api/user/login</strong></summary>

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):** Sets HTTP-only cookie `token`
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "profilepic": "https://cloudinary.com/..."
  }
}
```
</details>

---

## 🔌 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `connection` | `{ userId }` via query | Initialize socket with user ID |
| `sendMessage` | `{ receiverId, message }` | Send chat message |
| `call-user` | `{ to, from, callerInfo }` | Initiate video call |
| `answer-call` | `{ to, answer }` | Accept incoming call |
| `call-rejected` | `{ to }` | Decline incoming call |
| `end-call` | `{ to }` | Terminate active call |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `getonline` | `[userId, ...]` | Array of online user IDs |
| `newMessage` | `{ senderId, message, ... }` | Incoming chat message |
| `incoming-call` | `{ from, callerInfo, offer }` | Incoming call notification |
| `call-answered` | `{ answer }` | Call was accepted |
| `call-rejected` | `{}` | Call was declined |
| `call-ended` | `{}` | Call was terminated |

---

## 📹 WebRTC Flow

```
┌──────────────┐                                    ┌──────────────┐
│   CALLER     │                                    │   CALLEE     │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │ 1. getUserMedia() - Get camera/mic               │
       │ 2. Create PeerJS peer                             │
       │ 3. Emit 'call-user' via Socket.IO                │
       │ ─────────────────────────────────────────────────>│
       │                                                   │
       │                    4. Receive 'incoming-call'     │
       │                    5. Show modal + play ringtone  │
       │                                                   │
       │                    6. User clicks "Accept"        │
       │                    7. getUserMedia()              │
       │                    8. Emit 'answer-call'          │
       │<─────────────────────────────────────────────────│
       │                                                   │
       │ 9. Receive 'call-answered'                        │
       │ 10. PeerJS peer.call(calleeId, localStream)       │
       │ ─────────────────────────────────────────────────>│
       │                     (WebRTC Signaling via PeerJS) │
       │                                                   │
       │<═══════════════════════════════════════════════════>│
       │              11. P2P Media Stream Exchange        │
       │                   (Video/Audio flowing)           │
       │                                                   │
       │ 12. Either user clicks "End Call"                 │
       │ 13. Emit 'end-call'                               │
       │ ─────────────────────────────────────────────────>│
       │                                                   │
       │ 14. cleanupMediaStreams()                         │
       │ 15. Close PeerJS connection                       │
       │                                                   │
       ▼                                                   ▼
```

---

## 🗂 State Management

### Zustand Stores

#### `UserAuthStore.jsx`
Manages authentication, socket connection, and call state.

```javascript
// Key state properties
{
  user: { _id, fullname, email, profilepic },
  socket: Socket | null,
  onlineusers: [userId, ...],
  
  // Call state
  callState: {
    isInCall: boolean,
    type: 'idle' | 'outgoing' | 'incoming' | 'connected',
    remoteUser: { _id, fullname, profilepic } | null,
    callDuration: number,
    callStartTime: Date | null
  },
  
  // Actions
  signup: (data) => Promise,
  login: (data) => Promise,
  logout: () => Promise,
  connectSocket: () => void,
  disconnectSocket: () => void,
  startSocketMonitor: () => void,
  stopSocketMonitor: () => void,
  initiateCall: (userId) => void,
  answerCall: () => void,
  endCall: () => void,
  cleanupMediaStreams: () => void
}
```

#### `Messagestore.jsx`
Manages message state for active conversations.

```javascript
{
  messages: [{ _id, senderId, receiverId, message, createdAt }],
  selectedUser: { _id, fullname, profilepic } | null,
  
  // Actions
  setSelectedUser: (user) => void,
  getMessages: (userId) => Promise,
  sendMessage: (userId, message) => Promise,
  addMessage: (message) => void
}
```

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Invalid frame header" WebSocket error** | Proxy not handling WebSocket upgrade | Enable WebSocket support in CapRover/proxy |
| **CORS errors** | Origin not whitelisted | Add your domain to `corsOptions.origin` in `server/index.js` |
| **MongoDB connection fails** | Invalid connection string | Check `Mongo_Url` format, ensure IP whitelist in Atlas |
| **JWT cookie not sent** | Missing credentials config | Ensure `withCredentials: true` in Axios and CORS `credentials: true` |
| **Ringtone not playing** | Browser autoplay policy | User must interact with page before audio plays |
| **Video call fails to connect** | NAT traversal issues | Configure Twilio TURN servers |
| **Duplicate socket listeners** | Multiple `connectSocket` calls | Check `if (socket?.connected) return` guard |
| **Static files return 404** | Wrong path in Docker | Ensure `client/dist` path matches Dockerfile COPY |
| **Environment variables undefined** | `.env` not loaded or syntax error | Check for spaces around `=`, ensure `dotenv` is first import |

### Debug Commands

```bash
# Check if MongoDB is accessible
mongosh "your_connection_string"

# Test API health
curl http://localhost:3000/api/user/check

# Check Docker logs
docker logs <container_id>

# CapRover logs
# Go to App → Deployment → View App Logs
```

---

## 🔒 Security Considerations

### Implemented
- ✅ HTTP-only cookies (prevents XSS token theft)
- ✅ JWT expiration
- ✅ Password hashing (bcrypt)
- ✅ CORS whitelist
- ✅ Environment variable secrets

### Recommended Additions
- [ ] Rate limiting on auth endpoints
- [ ] Input validation/sanitization (express-validator)
- [ ] Helmet.js security headers
- [ ] CSRF protection
- [ ] Request size limits
- [ ] SQL/NoSQL injection prevention
- [ ] HTTPS enforcement

---

## 🚀 Future Enhancements

- [ ] **Group Chats** — Multi-user conversations
- [ ] **Message Pagination** — Load older messages on scroll
- [ ] **Typing Indicators** — "User is typing..."
- [ ] **Read Receipts** — Double-check marks
- [ ] **Message Search** — Find past messages
- [ ] **File Sharing** — Send images/documents
- [ ] **Push Notifications** — Browser notifications
- [ ] **Dark Mode** — Theme toggle
- [ ] **E2E Encryption** — End-to-end message encryption
- [ ] **Screen Sharing** — Share screen during calls
- [ ] **Unit Tests** — Jest + React Testing Library
- [ ] **CI/CD Pipeline** — GitHub Actions

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Zeeshan**
- GitHub: [@zeeshan-890](https://github.com/zeeshan-890)

---

## 🙏 Acknowledgments

- [Socket.IO](https://socket.io/) — Real-time communication
- [PeerJS](https://peerjs.com/) — WebRTC abstraction
- [Zustand](https://zustand-demo.pmnd.rs/) — State management
- [Cloudinary](https://cloudinary.com/) — Image hosting
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Database hosting
