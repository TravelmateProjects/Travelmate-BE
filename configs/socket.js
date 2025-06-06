const socketIo = require('socket.io');
const Message = require('../models/Message');

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });    // Handle sending messages - Note: This is now handled by the REST API endpoint
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
