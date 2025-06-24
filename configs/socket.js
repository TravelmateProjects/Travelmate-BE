const socketIo = require('socket.io');
const Message = require('../models/Message');

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });
    
    // Handle user joining their personal room for chat list updates and notifications
    socket.on('joinPersonalRoom', (userId) => {
      const personalRoom = `user_${userId}`;
      socket.join(personalRoom);
      console.log(`Socket ${socket.id} joined personal room: ${personalRoom}`);
      
      // Emit confirmation back to client
      socket.emit('joinedPersonalRoom', { personalRoom, userId });
    });

    // Handle notification acknowledgment
    socket.on('notificationReceived', (notificationId) => {
      console.log(`Notification ${notificationId} received by client ${socket.id}`);
    });

    // Handle notification read status update
    socket.on('markNotificationRead', (notificationId) => {
      // Emit to other devices of the same user that notification was read
      socket.broadcast.emit('notificationRead', notificationId);
    });

    socket.on('leaveRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    });
    
    // to avoid duplicate message creation. Keep this commented out.
    /*
    socket.on('sendMessage', async ({ chatRoomId, content, userId }) => {
      try {
        const msg = await Message.create({ 
          chatRoomId, 
          sender: userId, // userId should be passed from the client
          content 
        });
        const populatedMsg = await Message.findById(msg._id).populate('sender', 'name');
        io.to(chatRoomId).emit('newMessage', populatedMsg);
      } catch (error) {
        console.log('Error sending message via socket:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    */

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;
