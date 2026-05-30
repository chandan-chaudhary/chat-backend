# Real-Time Chat Application

A full-featured real-time chat application built with Node.js, Express, Socket.IO, Prisma, and PostgreSQL. Users can create accounts, connect to the chat server, send messages to other users, and see real-time online/offline status.

## 🚀 Features

- ✅ User authentication with JWT tokens
- ✅ Real-time messaging with Socket.IO
- ✅ Online/offline status tracking
- ✅ Chat history persistence
- ✅ Username-based messaging (no need to remember IDs)
- ✅ PostgreSQL database with Prisma ORM
- ✅ REST API + WebSocket support
- ✅ Terminal-based chat client

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Real-time:** Socket.IO
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Auth:** JWT (jsonwebtoken)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (or use Neon cloud database)

## ⚙️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd chat-app
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key_here
PORT=3000
API_URL=http://localhost:{{PORT}}
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

## 🏃 Running the Application

### Start the Server

```bash
npm run dev
```

You should see:

```
🚀 Chat Server is running!

📡 Server URL: http://localhost:3000
🔌 Socket.IO: ws://localhost:3000
```

## 💬 How to Chat

### Quick Start Guide

**Step 1:** Start the server

```bash
npm run dev
```

**Step 2:** Register a new user (using `rest-client/auth.http` in VS Code)

Open `rest-client/auth.http` and click "Send Request":

```http
POST http://localhost:3000/api/users/create
Content-Type: application/json

{
  "username": "USERNAME_HERE"
}
```

**Step 3:** Login and connect to Socket.IO (using `rest-client/socketconnection.http`)

Open `rest-client/socketconnection.http` and click "Send Request":

```http
POST http://localhost:3000/api/socket/connect
Content-Type: application/json

{
  "username": "USERNAME_HERE"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "username": "USERNAME_HERE",
    "isOnline": true
  },
  "token": "eyJhbGci...",
  "socketId": "abc123",
  "socketConnected": true
}
```

Save the token for authenticated requests!

**Step 4:** Send messages

Open `rest-client/chat.http` and update the token, then send:

```http
@token = YOUR_TOKEN_HERE

POST http://localhost:3000/api/messages/send
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "receiverUsername": "USERNAME_OF_RECEIVER",
  "content": "Hello!"
}
```

The message will be delivered in real-time to Bob if they're connected!

## 📡 API Endpoints

### REST API

| Method | Endpoint                          | Auth Required | Description                | Body                                                                  |
| ------ | --------------------------------- | ------------- | -------------------------- | --------------------------------------------------------------------- |
| GET    | `/health`                         | No            | Health check               | -                                                                     |
| POST   | `/api/users/create`               | No            | Register new user          | `{ "username": "USERNAME_HERE" }`                                     |
| GET    | `/api/users`                      | Yes           | Get all users              | -                                                                     |
| GET    | `/api/users/online`               | No            | Get online users only      | -                                                                     |
| POST   | `/api/socket/connect`             | No            | Login & connect to socket  | `{ "username": "USERNAME_HERE" }`                                     |
| POST   | `/api/socket/disconnect`          | Yes           | Disconnect from socket     | -                                                                     |
| POST   | `/api/messages/send`              | Yes           | Send message               | `{ "receiverUsername": "USERNAME_OF_RECEIVER", "content": "Hello!" }` |
| GET    | `/api/messages/history/:username` | Yes           | Get chat history with user | -                                                                     |
| GET    | `/api/conversations`              | Yes           | Get all conversations      | -                                                                     |

### Authentication

For endpoints requiring auth, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## 🔌 Socket.IO Events

### Client → Server (Emit)

| Event          | Data                                            | Description                  |
| -------------- | ----------------------------------------------- | ---------------------------- |
| `message:send` | `{ receiverUsername: string, content: string }` | Send a message               |
| `chat:history` | `{ otherUserId: number }`                       | Request chat history         |
| `users:online` | -                                               | Request list of online users |

### Server → Client (Listen)

| Event                   | Data                             | Description                        |
| ----------------------- | -------------------------------- | ---------------------------------- |
| `connect`               | -                                | Successfully connected             |
| `message:receive`       | `Message`                        | Receive a new message              |
| `message:sent`          | `Message`                        | Confirmation that message was sent |
| `user:online`           | `{ userId, username, isOnline }` | User came online                   |
| `user:offline`          | `{ userId, username, isOnline }` | User went offline                  |
| `chat:history:response` | `{ messages: Message[] }`        | Chat history response              |
| `users:online:response` | `User[]`                         | Online users list                  |
| `error`                 | `{ message: string }`            | Error occurred                     |

## 📁 Project Structure

```
chat-app/
├── src/
│   ├── app.ts                       # Express app setup
│   ├── socket.ts                    # Socket.IO server setup
│   ├── prisma.ts                    # Prisma client instance
│   ├── clientSocketConnection.ts    # Socket connection management
│   ├── controllers/
│   │   ├── user.controller.ts       # User registration
│   │   ├── socket.controller.ts     # Socket connect/disconnect
│   │   ├── message.controller.ts    # Message operations
│   │   └── conversation.controller.ts # Conversation management
│   ├── middleware/
│   │   └── auth.middleware.ts       # JWT authentication
│   └── routes/
│       ├── index.ts                 # Route aggregation
│       ├── user.routes.ts           # User endpoints
│       ├── socket.routes.ts         # Socket endpoints
│       ├── message.routes.ts        # Message endpoints
│       └── conversation.routes.ts   # Conversation endpoints
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── migrations/                  # Database migrations
├── rest-client/
│   ├── auth.http                    # User registration tests
│   ├── socketconnection.http        # Socket connection tests
│   └── chat.http                    # Chat API tests
├── .env                             # Environment variables
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
└── nodemon.json                     # Nodemon config
```

## 🎯 Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"username": "user1"}'
```

Response:

```json
{
  "id": 1,
  "username": "user1",
  "isOnline": false
}
```

### Login and Connect to Socket

```bash
curl -X POST http://localhost:3000/api/socket/connect \
  -H "Content-Type: application/json" \
  -d '{"username": "user1"}'
```

Response:

```json
{
  "user": {
    "id": 1,
    "username": "user1",
    "isOnline": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "socketId": "abc123xyz",
  "socketConnected": true
}
```

### Send a Message (REST API)

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "receiverUsername": "user2",
    "content": "Hello user2!"
  }'
```

### Get Chat History

```bash
curl http://localhost:3000/api/messages/history/bob \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Online Users

```bash
curl http://localhost:3000/api/users/online
```

### Disconnect from Socket

```bash
curl -X POST http://localhost:3000/api/socket/disconnect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🧪 Testing

Use the REST client files in VS Code with the REST Client extension:

1. **User Registration:** `rest-client/auth.http`
2. **Socket Connection:** `rest-client/socketconnection.http`
3. **Messaging:** `rest-client/chat.http`

## 📜 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build TypeScript to JavaScript
npm run start            # Run production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

## 🔄 Application Flow

1. **Registration:** User registers with unique username (stored in lowercase)
2. **Login:** User logs in via `/api/socket/connect` → receives JWT token + socket connection
3. **Real-time:** User is now online and can send/receive messages in real-time
4. **Messaging:** Messages sent via REST API are delivered via Socket.IO
5. **Disconnect:** User disconnects via `/api/socket/disconnect` or closes connection

## 🔧 Troubleshooting

**Issue: Username already exists**

- Usernames are stored in lowercase and must be unique
- "alice", "Alice", and "ALICE" are treated as the same user
- Choose a different username to register

**Issue: User not found during login**

- Ensure you've registered the user first via `/api/users/create`
- Check username spelling (case doesn't matter)

**Issue: Already connected message**

- The user is already connected to the socket
- The response will include the existing socketId and a new token
- No action needed, you can continue using the connection

**Issue: Cannot connect to database**

- Check your `DATABASE_URL` in `.env`
- Ensure your PostgreSQL server is running
- Run `npm run prisma:migrate` to sync the schema

**Issue: Socket connection fails**

- Ensure the server is running on the correct port
- Check for CORS issues if connecting from a browser
- Verify you've called `/api/socket/connect` successfully

**Issue: Messages not sending**

- Ensure the receiver is online (connected via socket)
- Check that the receiver username is correct
- Verify the sender has a valid JWT token in Authorization header

**Issue: JWT token expired**

- Tokens expire after 1 day
- Reconnect via `/api/socket/connect` to get a new token

## 📝 License

None

## 👨‍💻 Author

Chandan Chaudhary

---

**Happy Chatting!**
