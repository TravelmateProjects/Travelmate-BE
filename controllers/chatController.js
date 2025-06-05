const ChatRoom = require('../models/ChatRoom');
const cloudinary = require('../configs/cloudinary');
const Message = require('../models/Message');

exports.getAllChatRooms = async (req, res) => {
    try {
        const chatRooms = await ChatRoom.find().populate('participants', 'fullName email avatar');
        res.status(200).json({ message: 'Get chatrooms successful', data: chatRooms });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat rooms', error: error.message });
    }
};

exports.getChatRooms = async (req, res) => {
    try {
        const userId = req.account.userId;
        const chatRooms = await ChatRoom.find({ participants: userId }).populate('participants', 'fullName email avatar');
        
        // Get lastMessage for each chatRoom
        const chatRoomsWithLastMessage = await Promise.all(
            chatRooms.map(async (chatRoom) => {
                // Find the latest message in this chatRoom
                const lastMessage = await Message.findOne({ chatRoomId: chatRoom._id })
                    .populate('sender', 'fullName email avatar')
                    .sort({ createdAt: -1 }) // Sort to get the most recent message
                    .lean(); // optimize performance by using lean()
                
                return {
                    ...chatRoom.toObject(),
                    lastMessage: lastMessage ? {
                        _id: lastMessage._id,
                        chatRoomId: lastMessage.chatRoomId,
                        content: lastMessage.content,
                        sender: lastMessage.sender,
                        createdAt: lastMessage.createdAt,
                        attachments: lastMessage.attachments || []
                    } : null
                };
            })
        );
        
        // Sort chatRooms by lastMessage time (newest first)
        chatRoomsWithLastMessage.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });
        
        res.status(200).json({ message: 'Get chatrooms successful', data: chatRoomsWithLastMessage });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user chat rooms', error: error.message });
    }
};

exports.getChatRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const chatRoom = await ChatRoom.findById(id).populate('participants', 'fullName email avatar');
        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }
        res.status(200).json({ message: 'Get chatrooms successful', data: chatRoom });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat room', error: error.message });
    }
};

exports.createChatRoom = async (req, res) => {
    try {
        const { name, participants } = req.body;
        const createdBy = req.account.userId; // Assuming req.account contains authenticated user info

        const isGroup = participants.length > 2; // Automatically set isGroup to true if participants are more than 2

        const chatRoom = new ChatRoom({
            name,
            isGroup,
            participants,
            createdBy
        });

        await chatRoom.save();
        res.status(201).json({ message: "Create chatroom successful", data: chatRoom });
    } catch (error) {
        res.status(500).json({ message: 'Error creating chat room', error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params; // Chat room ID
        const { content } = req.body;
        const sender = req.account.userId; // Assuming req.account contains authenticated user info

        // Check if the chat room exists
        const chatRoom = await ChatRoom.findById(id);
        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        const attachments = [];
        if (req.files) {
            for (const [key, files] of Object.entries(req.files)) {
                for (const file of files) {
                    const fileExtension = file.originalname.split('.').pop(); // Extract file extension
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Generate a unique suffix
                    const fileNameWithoutExtension = file.originalname.includes('.')
                        ? file.originalname.substring(0, file.originalname.lastIndexOf('.'))
                        : file.originalname; // Get the file name without extension if it exists
                    const newFileName = `${fileNameWithoutExtension}-${uniqueSuffix}.${fileExtension}`; // Create a new file name including the extension

                    const directoryPath = `MessageAttachments/${key.slice(0, -1)}`; // Determine directory based on file type
                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream({
                            resource_type: key === 'videos' ? 'video' : 'auto',
                            folder: directoryPath,
                            public_id: newFileName // Use the new file name including the extension
                        }, (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }).end(file.buffer);
                    });

                    attachments.push({
                        type: key.slice(0, -1), // Remove the plural 's'
                        url: result.secure_url, // Original URL from Cloudinary
                        publicId: result.public_id
                    });
                }
            }
        }

        const message = new Message({
            chatRoomId: id,
            sender,
            content,
            attachments
        });

        await message.save();
        // Populate the message with sender info before emitting
        const populatedMessage = await Message.findById(message._id).populate('sender', 'fullName email avatar');

        // Emit socket event to room for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(id).emit('newMessage', populatedMessage);
        }

        res.status(201).json({ message: 'Message sent successfully', data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params; // Chat room ID
        const messages = await Message.find({ chatRoomId: id }).populate('sender', 'fullName email avatar').sort({ createdAt: -1 });
        res.status(200).json({ message: 'Messages retrieved successfully', data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving messages', error: error.message });
    }
};

exports.deleteChatRoom = async (req, res) => {
    try {
        const { id } = req.params; // Chat room ID

        // Find all messages in the chat room
        const messages = await Message.find({ chatRoomId: id });

        // Delete attachments from Cloudinary for each message
        for (const message of messages) {
            if (message.attachments && message.attachments.length > 0) {
                for (const attachment of message.attachments) {
                    try {
                        await cloudinary.uploader.destroy(attachment.publicId, {
                            resource_type: attachment.type === 'video' ? 'video' : attachment.type === 'image' ? 'image' : 'raw' // Ensure correct resource type
                        });
                    } catch (error) {
                        console.error(`Failed to delete attachment with publicId ${attachment.publicId}:`, error);
                    }
                }
            }
        }

        // Delete all messages in the chat room
        await Message.deleteMany({ chatRoomId: id });

        // Delete the chat room
        const chatRoom = await ChatRoom.findByIdAndDelete(id);
        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        res.status(200).json({ message: 'Chat room and its messages deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting chat room', error: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { id, messageId } = req.params; // Chat room ID and message ID

        // Find the message
        const message = await Message.findOneAndDelete({ _id: messageId, chatRoomId: id });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Delete attachments from Cloudinary if they exist
        if (message.attachments && message.attachments.length > 0) {
            for (const attachment of message.attachments) {
                try {
                    await cloudinary.uploader.destroy(attachment.publicId, {
                        resource_type: attachment.type === 'video' ? 'video' : attachment.type === 'image' ? 'image' : 'raw' // Ensure correct resource type
                    });
                } catch (error) {
                    console.error(`Failed to delete attachment with publicId ${attachment.publicId}:`, error);
                }
            }
        }

        res.status(200).json({ message: 'Message and its attachments deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message', error: error.message });
    }
};