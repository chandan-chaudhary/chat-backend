// Test Script: Connect user via Socket.IO (like HTML file does)
// Usage: node connect-user.js <username>

const io = require('socket.io-client');

const API_URL = 'http://localhost:3000';
const username = process.argv[2] || 'TestUser';

async function createAndConnectUser() {
  console.log(`\n🔄 Creating user: ${username}...`);
  
  // Step 1: Create user via REST API (just like HTML file)
  const response = await fetch(`${API_URL}/api/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, autoConnect: true })
  });

  const data = await response.json();
  console.log('✅ User created:', data.user);
  console.log('🔑 Token:', data.token);

  // Step 2: Connect via Socket.IO (just like HTML file does)
  console.log('\n🔌 Connecting to Socket.IO...');
  
  const socket = io(API_URL, {
    auth: { token: data.token }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO!');
    console.log('📡 Socket ID:', socket.id);
    console.log(`\n👤 ${username} is now online and can receive real-time messages!`);
    console.log('\nPress Ctrl+C to disconnect\n');
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from Socket.IO');
  });

  socket.on('message:receive', (message) => {
    console.log('\n📩 New message received:');
    console.log(`From: ${message.sender.username}`);
    console.log(`Content: ${message.content}`);
    console.log(`Time: ${new Date(message.createdAt).toLocaleString()}`);
  });

  socket.on('user:online', (data) => {
    console.log(`\n🟢 ${data.username} came online`);
  });

  socket.on('user:offline', (data) => {
    console.log(`\n⚫ ${data.username} went offline`);
  });

  socket.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  });
}

createAndConnectUser().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
