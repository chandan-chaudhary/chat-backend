# REST Client Testing Guide

## Files Overview

1. **auth.http** - HTTP requests for testing REST API endpoints
2. **socket-events.md** - Documentation of all Socket.IO events
3. **test-client.html** - Interactive HTML client for testing

## How to Test

### Option 1: Using HTTP Files (VS Code REST Client Extension)

1. Install "REST Client" extension in VS Code
2. Open `auth.http`
3. Click "Send Request" above each request
4. View responses inline

### Option 2: Using the HTML Test Client

1. Start your server: `npm run dev`
2. Open `test-client.html` in a browser
3. Use the interactive UI to:
   - Create users and connect
   - Send messages
   - View online users
   - Fetch chat history
   - See real-time messages

### Option 3: Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'

# Get all users
curl http://localhost:3000/api/users
```

## Testing Socket.IO Events

### Using Node.js Client

```javascript
const io = require("socket.io-client");

// First, create a user via REST API to get a token
// Then use the token to connect:

const socket = io("http://localhost:3000", {
  auth: { token: "YOUR_JWT_TOKEN" },
});

socket.on("connect", () => {
  console.log("Connected!");

  // Send a message
  socket.emit("message:send", {
    receiverId: 2,
    content: "Hello!",
  });
});

socket.on("message:receive", (msg) => {
  console.log("Received:", msg);
});
```

## Complete Testing Flow

1. **Start Server**

   ```bash
   npm run dev
   ```

2. **Create Users**

   - Use `auth.http` or test client to create 2+ users
   - Save the JWT tokens

3. **Connect via Socket.IO**

   - Open `test-client.html` in multiple browser tabs
   - Login with different users in each tab

4. **Test Real-time Chat**

   - Send messages between users
   - Observe real-time delivery
   - Check online/offline status updates

5. **Test Chat History**
   - Fetch previous conversations
   - Verify messages are stored correctly

## API Endpoints

| Method | Endpoint            | Description                 |
| ------ | ------------------- | --------------------------- |
| GET    | `/health`           | Health check                |
| POST   | `/api/users/create` | Create user & get JWT token |
| GET    | `/api/users`        | Get all users               |

## Socket.IO Events

### Emit (Client → Server)

- `message:send` - Send a message
- `chat:history` - Fetch chat history
- `message:read` - Mark message as read
- `users:online` - Get online users

### Listen (Server → Client)

- `message:receive` - Receive new message
- `message:sent` - Confirmation of sent message
- `user:online` - User came online
- `user:offline` - User went offline
- `chat:history:response` - Chat history data
- `users:online:response` - Online users list
