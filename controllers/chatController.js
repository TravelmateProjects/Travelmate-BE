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
        const { id } = req.params; // Get chatRoomId from params
        const { plan, destination, arrivalDate, returnDate, notes } = req.body;

        // Find and validate chat room
        const chatRoom = await ChatRoom.findById(id);

        // Validate required fields
        if (!destination || !arrivalDate || !returnDate) {
            return res.status(400).json({ message: 'Destination, arrivalDate, and returnDate are required' });
        }

        // Get participants from chatRoom if available
        let allParticipants = chatRoom && Array.isArray(chatRoom.participants)
            ? chatRoom.participants
            : [];
            
        // Ensure creator is included in participants
        if (!allParticipants.includes(creatorId)) {
            allParticipants.push(creatorId);
        }

        const travelHistory = new TravelHistory({
            creatorId,
            plan: plan || null,
            participants: allParticipants,
            destination,
            arrivalDate,
            returnDate,
            status: 'planing', // Set initial status to planning
            notes: notes // Preserve the original value of notes, even if it is an empty string
        });
        await travelHistory.save();

        // Create system message for the new travel history
        const creator = await User.findById(creatorId).select('fullName');
        const systemMessageData = await chatUtils.createSystemMessage(
            id,
            'travelHistoryCreated',
            { fullName: creator.fullName, destination }
        );

        // Emit socket events to all participants
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
            
            // Emit chat list update to all participants
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

// Store conversation history in memory (will reset when server restarts)
const conversationHistory = new Map();

exports.handleChatAI = async (req, res) => {
    const { message: userMessage, conversationId } = req.body;
    const userId = req.account.userId;
    
    // Create a unique conversation ID if not provided or use existing one
    const convId = conversationId || `${userId}_${Date.now()}`;

    if (!userMessage) {
        return res.status(400).json({ reply: 'Please enter a message.' });
    }

    // Language detection:
    // 1. First check for distinctive Vietnamese characters (diacritics)
    // 2. Then check for common Vietnamese words/phrases (more specific matching)
    // 3. Default to English if no clear Vietnamese indicators
    const vietnameseCharacters = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
    
    // Vietnamese words/phrases for detection (excluding place names that appear in English)
    const vietnameseWords = [
        'xin chào', 'xin chao', 'chào', 'chao',
        'cảm ơn', 'cam on', 'cám ơn',
        'không', 'khong',
        'vâng', 'vang', 'dạ', 'da',
        'tôi', 'toi', 'mình', 'minh',
        'bạn', 'ban', 'anh', 'chị', 'chi', 'em',
        'làm sao', 'lam sao',
        'thế nào', 'the nao',
        'bao nhiêu', 'bao nhieu',
        'ở đâu', 'o dau',
        'khi nào', 'khi nao',
        'tại sao', 'tai sao',
        'gì vậy', 'gi vay',
        'có thể', 'co the',
        'có', 'co',
        'là', 'la',
        'này', 'nay',
        'được', 'duoc',
        'và', 'va',
        'hoặc', 'hoac',
        'với', 'voi',
        'của', 'cua',
        'cho', 'den',
        'từ', 'tu',
        'rất', 'rat',
        'nhiều', 'nhieu'
    ];

    // English indicator words that strongly suggest English
    const englishWords = [
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
        'want', 'need', 'like', 'love', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'can', 'could', 'should', 'may', 'might', 'must',
        'travel', 'trip', 'vacation', 'holiday', 'city', 'place', 'where', 'when', 'how', 'what', 'why',
        'hello', 'hi', 'thank', 'thanks', 'please', 'sorry', 'yes', 'no'
    ];
    
    // Normalize message for comparison (remove accents and convert to lowercase)
    const messageNoAccent = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check for Vietnamese word matches (with word boundaries)
    const containsVietnameseWord = vietnameseWords.some(word => {
        const wordNoAccent = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const regex = new RegExp(`\\b${wordNoAccent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(messageNoAccent);
    });

    // Check for English word matches (with word boundaries)
    const containsEnglishWord = englishWords.some(word => {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(messageNoAccent);
    });
    
    // Language detection logic:
    // 1. Vietnamese characters (diacritics) are the strongest indicator for Vietnamese
    // 2. If no diacritics, check word indicators
    // 3. English words override Vietnamese words when no diacritics present
    let isVietnamese;
    if (vietnameseCharacters.test(userMessage)) {
        // Strong Vietnamese indicator
        isVietnamese = true;
    } else if (containsEnglishWord && !containsVietnameseWord) {
        // Strong English indicator
        isVietnamese = false;
    } else if (containsVietnameseWord && !containsEnglishWord) {
        // Only Vietnamese words detected
        isVietnamese = true;
    } else if (containsEnglishWord && containsVietnameseWord) {
        // Mixed indicators - lean towards English if no diacritics
        isVietnamese = false;
    } else {
        // No clear indicators - default to English for international context
        isVietnamese = false;
    }

    // Get or create conversation history
    if (!conversationHistory.has(convId)) {
        conversationHistory.set(convId, []);
    }
    const history = conversationHistory.get(convId);

    // Limit conversation history to last 20 messages to avoid token limits
    if (history.length > 20) {
        history.splice(0, history.length - 20);
    }

    // Build conversation contents for Gemini API
    const contents = [];
    
    // For conversation with context, build a single comprehensive prompt
    let contextualPrompt;
    if (isVietnamese) {
        contextualPrompt = `Bạn là một hướng dẫn viên du lịch thân thiện, chuyên tư vấn về các địa điểm du lịch tại Việt Nam, bao gồm điểm tham quan, hoạt động vui chơi, món ăn đặc sản, và gợi ý lịch trình. Nếu người dùng hỏi về chủ đề không liên quan đến du lịch, hãy trả lời lịch sự rằng bạn chỉ hỗ trợ về du lịch.
                Người dùng đang sử dụng tiếng Việt, hãy trả lời bằng tiếng Việt.`;
    } else {
        contextualPrompt = `You are a friendly travel guide specializing in Vietnamese tourist destinations, including attractions, activities, local cuisine, and itinerary suggestions. If users ask about topics unrelated to travel, politely explain that you only provide travel assistance.
                IMPORTANT: The user is communicating in English, so you MUST respond ONLY in English. Do NOT use any Vietnamese words, including greetings like "xin chào". Your entire response must be 100% in English only.`;
    }

    // If this is the first message, add the full prompt
    if (history.length === 0) {
        contents.push({
            role: 'user',
            parts: [{ text: `${contextualPrompt}\n\nCâu hỏi: ${userMessage}` }]
        });
    } else {
        // For subsequent messages, include conversation context
        let conversationContext = '';
        for (let i = 0; i < history.length; i += 2) {
            if (history[i] && history[i + 1]) {
                const userMsg = history[i].content.replace(contextualPrompt, '').replace('Câu hỏi:', '').replace('Question:', '').trim();
                const aiMsg = history[i + 1].content;
                conversationContext += `User: ${userMsg}\nAI: ${aiMsg}\n\n`;
            }
        }
        
        const questionLabel = isVietnamese ? 'Câu hỏi hiện tại:' : 'Current question:';
        const conversationLabel = isVietnamese ? 'Đoạn hội thoại trước:' : 'Previous conversation:';
        
        contents.push({
            role: 'user',
            parts: [{ text: `${contextualPrompt}\n\n${conversationLabel}\n${conversationContext}${questionLabel} ${userMessage}` }]
        });
    }

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    // maxOutputTokens: 1000,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        // Check if response has the expected structure
        if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
            console.error('Invalid Gemini API response structure:', response.data);
            return res.status(500).json({ reply: 'Invalid response from AI service. Please try again.' });
        }

        // Check if the candidate has content and parts
        const candidate = response.data.candidates[0];
        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
            console.error('Invalid candidate structure:', candidate);
            return res.status(500).json({ reply: 'Invalid response structure from AI service. Please try again.' });
        }

        // Retrieve the reply from the Gemini API response
        const reply = candidate.content.parts[0].text;
        
        if (!reply) {
            console.error('Empty reply from Gemini API');
            return res.status(500).json({ reply: 'Received empty response from AI service. Please try again.' });
        }
        
        // Add messages to conversation history
        if (history.length === 0) {
            // For first message, store the contextual prompt and response
            history.push({ role: 'user', content: `${contextualPrompt}\n\nCâu hỏi: ${userMessage}` });
            history.push({ role: 'model', content: reply });
        } else {
            // For subsequent messages, store user message and response
            history.push({ role: 'user', content: userMessage });
            history.push({ role: 'model', content: reply });
        }
        
        // Set expiration for conversation (optional - cleanup after 1 hour)
        setTimeout(() => {
            if (conversationHistory.has(convId)) {
                conversationHistory.delete(convId);
            }
        }, 60 * 60 * 1000); // 1 hour

        res.json({ 
            reply, 
            conversationId: convId,
            messageCount: Math.floor(history.length / 2) // Number of exchanges
        });
        // console.log("conversationId:", convId);
    } catch (err) {
        console.error('Gemini Error:', err.message);
        
        // Check if it's a rate limit or quota error
        if (err.response?.status === 429) {
            return res.status(500).json({ reply: 'AI service is temporarily busy. Please try again in a moment.' });
        } else if (err.response?.status === 403) {
            return res.status(500).json({ reply: 'AI service access denied. Please check API configuration.' });
        } else if (err.response?.data?.error?.message) {
            return res.status(500).json({ reply: `AI service error: ${err.response.data.error.message}` });
        }
        
        res.status(500).json({ reply: 'Sorry, an error occurred. Please try again later.' });
    }
};

// Add endpoint to clear conversation
exports.clearChatAI = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = req.account.userId;
        // console.log("conversationId:", conversationId);
        
        if (conversationId) {
            // Clear specific conversation
            if (conversationHistory.has(conversationId)) {
                conversationHistory.delete(conversationId);
                res.json({ message: 'Conversation cleared successfully' });
            } else {
                res.status(404).json({ message: 'Conversation not found' });
            }
        } else {
            // Clear all conversations for this user
            let deletedCount = 0;
            for (const [convId, history] of conversationHistory.entries()) {
                if (convId.startsWith(`${userId}_`)) {
                    conversationHistory.delete(convId);
                    deletedCount++;
                }
            }
            res.json({ 
                message: 'All AI conversations cleared successfully', 
                deletedCount 
            });
        }
    } catch (error) {
        console.error('Error clearing AI conversation:', error.message);
        res.status(500).json({ message: 'Error clearing conversation', error: error.message });
    }
};

// Lấy danh sách phòng chat theo userId
exports.getUserChatRoomsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const chatRooms = await ChatRoom.find({ participants: userId }).populate('participants', 'fullName email avatar');
        res.status(200).json({ message: 'Get user chatrooms successful', data: chatRooms });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user chat rooms', error: error.message });
    }
};