const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const TravelHistory = require('../models/TravelHistory');
const notificationUtils = require('../utils/notificationUtils');
const chatUtils = require('../utils/chatUtils');
const axios = require('axios');

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
        const chatRoomsWithLastMessage = await chatUtils.getChatRoomsWithLastMessage(userId);
        
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

        // const isGroup = participants.length > 2; // Automatically set isGroup to true if participants are more than 2
        const isGroup = true; // Force all chat rooms to be group chats(1-1 chatroom will be created auto)
        
        const chatRoom = new ChatRoom({
            name,
            isGroup,
            participants,
            createdBy
        });

        await chatRoom.save();

        // Populate the chat room with participant details for the response
        const populatedChatRoom = await ChatRoom.findById(chatRoom._id).populate('participants', 'fullName email avatar');

        // Emit socket event to all participants to update their chat lists
        const io = req.app.get('io');
        if (io) {
            chatUtils.emitNewChatRoomEvent(io, populatedChatRoom);
        }

        res.status(201).json({ message: "Create chatroom successful", data: populatedChatRoom });
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

        const attachments = await chatUtils.processAttachments(req.files);

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
            // Emit to the specific chat room for real-time messaging
            // console.log(`Emitting newMessage to room: ${id}`);
            io.to(id).emit('newMessage', populatedMessage);
            
            // Emit to all participants of this chat room to update their chat list
            const chatRoom = await ChatRoom.findById(id).populate('participants');
            if (chatRoom && chatRoom.participants) {
                chatUtils.emitChatListUpdate(io, chatRoom.participants.map(p => p._id), {
                    chatRoomId: id,
                    lastMessage: populatedMessage
                });
                
                // ...existing notification code...
                chatRoom.participants.forEach(async (participant) => {
                    // Create notification for other participants (not the sender)
                    if (participant._id.toString() !== sender.toString()) {
                        try {
                            await notificationUtils.createChatNotification(
                                participant._id,
                                sender,
                                id,
                                chatRoom.name,
                                content || 'Sent an attachment',
                                io
                            );
                        } catch (error) {
                            console.error('Error creating chat notification:', error);
                        }
                    }
                });
            }
        }

        res.status(201).json({ message: 'Message sent successfully', data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params; // Chat room ID
        const messages = await Message.find({ chatRoomId: id })
            .populate({
                path: 'sender',
                select: 'fullName email avatar',
                // Don't fail if sender is null (for system messages)
                options: { strictPopulate: false }
            })
            .sort({ createdAt: -1 });
        res.status(200).json({ message: 'Messages retrieved successfully', data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving messages', error: error.message });
    }
};

exports.deleteChatRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId;

        // Find and validate chat room
        const chatRoom = await ChatRoom.findById(id);
        const validation = chatUtils.validateChatRoomPermissions(chatRoom, userId, 'delete');
        
        if (!validation.valid) {
            return res.status(validation.status).json({ message: validation.error });
        }

        // Delete all messages and their attachments
        await chatUtils.deleteAllMessagesInChatRoom(id);

        // Delete all notifications related to this chat room
        await Notification.deleteMany({ 
            relatedId: id, 
            relatedModel: 'ChatRoom' 
        });

        // Delete the chat room
        await ChatRoom.findByIdAndDelete(id);
        
        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            chatUtils.emitChatRoomDeletedEvent(io, id, chatRoom.participants);
        }

        res.status(200).json({ message: 'Chat room and its messages deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting chat room', error: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { id, messageId } = req.params; // Chat room ID and message ID
        const userId = req.account.userId; // Get the user who is deleting the message

        // Find the message first to check ownership
        const message = await Message.findOne({ _id: messageId, chatRoomId: id });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Check if the user is the sender of the message or if it's a system message
        // System messages (sender is null) can only be deleted by chat room creator
        if (message.sender) {
            // Regular message - only sender can delete
            if (message.sender.toString() !== userId.toString()) {
                return res.status(403).json({ message: 'You can only delete your own messages' });
            }
        } else {
            // System message - only chat room creator can delete
            const chatRoom = await ChatRoom.findById(id);
            if (!chatRoom || chatRoom.createdBy.toString() !== userId.toString()) {
                return res.status(403).json({ message: 'You can only delete system messages if you are the chat room creator' });
            }
        }

        // Delete the message
        await Message.findByIdAndDelete(messageId);
        // console.log(`Message deleted: ${messageId} from chatroom: ${id}`);

        // Delete attachments from Cloudinary if they exist
        await chatUtils.deleteAttachmentsFromCloudinary(message.attachments);

        // Get the new last message after deletion
        const newLastMessage = await Message.findOne({ chatRoomId: id })
            .populate('sender', 'fullName email avatar')
            .sort({ createdAt: -1 })
            .lean();
            
        // console.log(`New last message after deletion:`, newLastMessage ? newLastMessage._id : 'null');

        // Emit socket event to room for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(id).emit('messageDeleted', { messageId, chatRoomId: id });
            
            // Update chat list for all participants with new last message
            const chatRoom = await ChatRoom.findById(id).populate('participants');
            if (chatRoom && chatRoom.participants) {
                chatUtils.emitChatListUpdate(io, chatRoom.participants.map(p => p._id), {
                    chatRoomId: id,
                    lastMessage: newLastMessage ? {
                        _id: newLastMessage._id,
                        chatRoomId: newLastMessage.chatRoomId,
                        content: newLastMessage.content,
                        sender: newLastMessage.sender,
                        createdAt: newLastMessage.createdAt,
                        attachments: newLastMessage.attachments || [],
                        messageType: newLastMessage.messageType || 'regular',
                        systemData: newLastMessage.systemData || null
                    } : null
                });
            }
        }

        res.status(200).json({ message: 'Message and its attachments deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message', error: error.message });
    }
};

exports.leaveChatRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId;

        // Find and validate chat room
        const chatRoom = await ChatRoom.findById(id);
        const validation = chatUtils.validateChatRoomPermissions(chatRoom, userId, 'leave');
        
        if (!validation.valid) {
            return res.status(validation.status).json({ message: validation.error });
        }
        
        // Get user info before removing from participants
        const leavingUser = await User.findById(userId).select('fullName');
        
        // Remove the user from participants
        chatRoom.participants = chatRoom.participants.filter(participantId => participantId.toString() !== userId.toString());
        await chatRoom.save();
        
        // Create system message
        const systemMessageData = await chatUtils.createSystemMessage(
            id, 
            'userLeftChatroom', 
            { fullName: leavingUser.fullName }
        );
        
        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            // Send system message to remaining participants
            io.to(id).emit('newMessage', systemMessageData);
            
            // Notify remaining participants and update chat lists
            chatRoom.participants.forEach((participantId) => {
                io.to(`user_${participantId}`).emit('participantLeft', { 
                    chatRoomId: id, 
                    userId: userId,
                    remainingParticipants: chatRoom.participants.length 
                });
            });
            
            chatUtils.emitChatListUpdate(io, chatRoom.participants, {
                chatRoomId: id,
                lastMessage: systemMessageData
            });

            // Notify the user who left
            io.to(`user_${userId}`).emit('chatRoomLeft', { chatRoomId: id });
        }
        
        res.status(200).json({ message: 'Left chat room successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error leaving chat room', error: error.message });
    }
};

exports.createTravelHistory = async (req, res) => {
    try {
        const creatorId = req.account.userId;
        const { id } = req.params; // Lấy chatRoomId từ params
        const { plan, destination, arrivalDate, returnDate } = req.body;

        // Find and validate chat room
        const chatRoom = await ChatRoom.findById(id);

        // Validate required fields
        if (!destination || !arrivalDate || !returnDate) {
            return res.status(400).json({ message: 'Destination, arrivalDate, and returnDate are required' });
        }

        // Lấy participants từ chatRoom nếu có, không thì lấy từ body, không cần ép creator vào nữa vì chatRoom đã chuẩn
        let allParticipants = chatRoom && Array.isArray(chatRoom.participants)
            ? chatRoom.participants
            : [];

        const travelHistory = new TravelHistory({
            creatorId,
            plan: plan || undefined,
            participants: allParticipants,
            destination,
            arrivalDate,
            returnDate
        });
        await travelHistory.save();

        // Tạo system message cho chuyến du lịch mới bằng chatUtils.createSystemMessage
        const creator = await User.findById(creatorId).select('fullName');
        const systemMessageData = await chatUtils.createSystemMessage(
            id,
            'travelHistoryCreated',
            { fullName: creator.fullName, destination }
        );

        // Emit socket events cho tất cả participants giống leaveChatRoom
        const io = req.app.get('io');
        
        if (io) {
            io.to(id).emit('newMessage', systemMessageData);

            allParticipants.forEach((participantId) => {
                io.to(`user_${participantId}`).emit('travelHistoryCreated', {
                    travelHistoryId: travelHistory._id,
                    creatorId,
                    creatorName: creator.fullName,
                    destination,
                    participants: allParticipants,
                    totalParticipants: allParticipants.length,
                    systemMessage: systemMessageData
                });
            });
            // Emit event tổng cho tất cả participants (giống chatUtils.emitChatListUpdate của leaveChatRoom)
            chatUtils.emitChatListUpdate(io, allParticipants, {
                chatRoomId: travelHistory._id,
                lastMessage: systemMessageData
            });
        }

        res.status(201).json({ message: 'Travel history created successfully', data: travelHistory });
    } catch (error) {
        res.status(500).json({ message: 'Error creating travel history', error: error.message });
    }
};

exports.addParticipant = async (req, res) => {
    try {
        const { id } = req.params; // chatRoomId
        let { userIdsToAdd } = req.body;
        const userId = req.account.userId;

        // Support passing a single user as a string (legacy)
        if (!Array.isArray(userIdsToAdd)) {
            if (req.body.userIdToAdd) userIdsToAdd = [req.body.userIdToAdd];
            else userIdsToAdd = [];
        }
        if (!userIdsToAdd || userIdsToAdd.length === 0) {
            return res.status(400).json({ message: 'No userIds provided' });
        }

        const chatRoom = await ChatRoom.findById(id);
        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }
        if (chatRoom.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the chat room creator can add participants' });
        }
        // Filter out users who are already in the group
        const currentIds = chatRoom.participants.map(pid => pid.toString());
        const newUserIds = userIdsToAdd.filter(uid => !currentIds.includes(uid));
        if (newUserIds.length === 0) {
            return res.status(400).json({ message: 'All users are already participants' });
        }
        chatRoom.participants.push(...newUserIds);
        await chatRoom.save();

        // Emit socket events
        let systemMessageData = null;
        const addedUsers = await User.find({ _id: { $in: newUserIds } }).select('fullName');
        const io = req.app.get('io');
        if (addedUsers.length === 1) {
            systemMessageData = await chatUtils.createSystemMessage(
                id,
                'userAddedToChatroom',
                { fullName: addedUsers[0].fullName }
            );
            if (io) {
                io.to(id).emit('newMessage', systemMessageData);
            }
        } else if (addedUsers.length > 1) {
            const firstName = addedUsers[0].fullName;
            const othersCount = addedUsers.length - 1;
            systemMessageData = await chatUtils.createSystemMessage(
                id,
                'manyUserAddedToChatroom',
                { fullName: firstName, othersCount }
            );
            if (io) {
                io.to(id).emit('newMessage', systemMessageData);
            }
        }
        // Send chat list updates and notifications to each new user
        if (io && systemMessageData) {
            chatUtils.emitChatListUpdate(io, chatRoom.participants, {
                chatRoomId: id,
                lastMessage: systemMessageData
            });
            newUserIds.forEach(uid => {
                io.to(`user_${uid}`).emit('addedToChatRoom', { chatRoomId: id });
            });
        }

        res.status(200).json({ message: 'Participants added successfully', data: chatRoom });
    } catch (error) {
        res.status(500).json({ message: 'Error adding participants', error: error.message });
    }
};

exports.removeParticipant = async (req, res) => {
    try {
        const { id } = req.params; // chatRoomId
        const { userIdToRemove } = req.body;
        const userId = req.account.userId;

        const chatRoom = await ChatRoom.findById(id);
        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }
        if (chatRoom.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the chat room creator can remove participants' });
        }
        if (!chatRoom.participants.includes(userIdToRemove)) {
            return res.status(400).json({ message: 'User is not a participant' });
        }
        chatRoom.participants = chatRoom.participants.filter(pid => pid.toString() !== userIdToRemove.toString());
        await chatRoom.save();

        // Create system message
        const removedUser = await User.findById(userIdToRemove).select('fullName');
        const systemMessageData = await chatUtils.createSystemMessage(
            id,
            'userKickedFromChatroom',
            { fullName: removedUser.fullName }
        );

        // Create system message
        const io = req.app.get('io');
        if (io) {
            io.to(id).emit('newMessage', systemMessageData);
            chatUtils.emitChatListUpdate(io, chatRoom.participants, {
                chatRoomId: id,
                lastMessage: systemMessageData
            });
            io.to(`user_${userIdToRemove}`).emit('kickedFromChatRoom', { chatRoomId: id });
        }

        res.status(200).json({ message: 'Participant removed successfully', data: chatRoom });
    } catch (error) {
        res.status(500).json({ message: 'Error removing participant', error: error.message });
    }
};

exports.handleChatAI = async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ reply: 'Please enter a message.' });
    }

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                // Gemini API uses 'contents' with 'parts' for messages
                contents: [
                    {
                        role: 'user', // System instructions are often handled in the prompt itself or as a preceding user/model turn.
                        parts: [
                            {
                                text: `Bạn là một hướng dẫn viên du lịch thân thiện, chuyên tư vấn về các địa điểm du lịch tại Việt Nam, bao gồm điểm tham quan, hoạt động vui chơi, món ăn đặc sản, và gợi ý lịch trình. Nếu người dùng hỏi về chủ đề không liên quan đến du lịch, hãy trả lời lịch sự rằng bạn chỉ hỗ trợ về du lịch. 
                                Người dùng hỏi: ${userMessage}`.trim(),
                            },
                        ],
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        // Retrieve the reply from the Gemini API response
        const reply = response.data.candidates[0].content.parts[0].text;
        res.json({ reply });
    } catch (err) {
        console.error('Gemini Error:', err.response?.data || err.message);
        res.status(500).json({ reply: 'Sorry, an error occurred. Please try again later.' });
    }
};