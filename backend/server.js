const app = require('./src/app');
const http = require('http');
const socketIo = require('socket.io');

// Get port from environment or default to 5001
const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their personal room`);
  });

  // Join admin room
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('User joined admin room');
  });

  // Handle issue updates
  socket.on('issue-updated', (data) => {
    // Broadcast to relevant users
    socket.to(`user-${data.reportedBy}`).emit('issue-status-changed', data);
    if (data.assignedTo) {
      socket.to(`user-${data.assignedTo}`).emit('issue-assigned', data);
    }
    socket.to('admin-room').emit('issue-updated', data);
  });

  // Handle new comments
  socket.on('comment-added', (data) => {
    socket.to(`user-${data.issueReporter}`).emit('new-comment', data);
    if (data.issueAssignee) {
      socket.to(`user-${data.issueAssignee}`).emit('new-comment', data);
    }
    socket.to('admin-room').emit('new-comment', data);
  });

  // Handle new issues (admin notification)
  socket.on('new-issue', (data) => {
    socket.to('admin-room').emit('new-issue-reported', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available globally for use in other modules
global.io = io;

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 IntelliCivic API Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/intellicivic'}
🔗 API URL: http://localhost:${PORT}
📚 Documentation: http://localhost:${PORT}/api/docs
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server;
