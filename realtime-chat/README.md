# Real-time Chat Application

A real-time messaging platform with discussion rooms, secure file sharing, and role-based access control. Built with the MERN stack and Socket.IO.

## Features
- Instant messaging with Socket.IO (WebSockets), typing indicators, message history
- Discussion rooms: create, join, leave, delete
- JWT authentication (REST + WebSocket handshake) and role-based authorization (`user`, `admin`)
- File sharing through AWS S3
  - AES-256 encryption at rest (S3 SSE-S3)
  - SHA-256 checksum sent with the upload (S3 rejects corrupted uploads) and re-verified on every download
- Passwords hashed with bcrypt, Helmet headers, rate-limited auth routes

## Tech stack
MongoDB, Express, React (Vite), Node.js, Socket.IO, AWS S3

## Getting started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- An S3 bucket and an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on it

### Server
```bash
cd server
cp .env.example .env     # fill in your values
npm install
npm run dev
```

### Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:5173

## Roles
- **user**: join rooms, send messages and files, delete own messages, delete own rooms
- **admin**: also delete any message or room. Whoever registers with the email set in `ADMIN_EMAIL` becomes admin.

## API overview
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` `/login` | Auth, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/rooms` | List / create rooms |
| POST | `/api/rooms/:id/join` `/leave` | Membership |
| DELETE | `/api/rooms/:id` | Owner or admin |
| GET | `/api/rooms/:roomId/messages` | History (members only) |
| DELETE | `/api/messages/:id` | Sender or admin |
| POST | `/api/rooms/:roomId/files` | Upload (max 10 MB) |
| GET | `/api/files/:id/download` | Download with integrity check |

Socket events: `message:send`, `message:new`, `message:deleted`, `typing`, `room:deleted`.

## Project structure
```
server/   Express API, Mongoose models, Socket.IO, S3 integration
client/   React (Vite) UI
```

## License
MIT
