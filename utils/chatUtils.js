const cloudinary = require('../configs/cloudinary');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const Notification = require('../models/Notification');

/**
 * Sort chat rooms by last message time (newest first)
 */
const sortChatRoomsByLastMessage = (chatRooms) => {
    return chatRooms.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });
};

/**
 * Format last message data for chat room list
 */
const formatLastMessage = (lastMessage) => {
    if (!lastMessage) return null;
    
    return {
        _id: lastMessage._id,
        chatRoomId: lastMessage.chatRoomId,
        content: lastMessage.content,
        sender: lastMessage.sender,
        createdAt: lastMessage.createdAt,
        attachments: lastMessage.attachments || [],
        messageType: lastMessage.messageType || 'regular',
        systemData: lastMessage.systemData || null
    };
};

/**
 * Get chat rooms with last message for a user
 */
const getChatRoomsWithLastMessage = async (userId) => {
    const chatRooms = await ChatRoom.find({ participants: userId })
        .populate('participants', 'fullName email avatar');
    
    const chatRoomsWithLastMessage = await Promise.all(
        chatRooms.map(async (chatRoom) => {
            const lastMessage = await Message.findOne({ chatRoomId: chatRoom._id })
                .populate('sender', 'fullName email avatar')
                .sort({ createdAt: -1 })
                .lean();
            
            return {
                ...chatRoom.toObject(),
                lastMessage: formatLastMessage(lastMessage)
            };
        })
    );
    
    return sortChatRoomsByLastMessage(chatRoomsWithLastMessage);
};

/**
 * Upload file to Cloudinary with proper naming
 */
const uploadFileToCloudinary = async (file, fileType) => {
    const fileExtension = file.originalname.split('.').pop();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileNameWithoutExtension = file.originalname.includes('.')
        ? file.originalname.substring(0, file.originalname.lastIndexOf('.'))
        : file.originalname;
    const newFileName = `${fileNameWithoutExtension}-${uniqueSuffix}.${fileExtension}`;
    const directoryPath = `MessageAttachments/${fileType}`;

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
            resource_type: fileType === 'video' ? 'video' : 'auto',
            folder: directoryPath,
            public_id: newFileName
        }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve({
                    type: fileType,
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        }).end(file.buffer);
    });
};

/**
 * Process file attachments for messages
 */
const processAttachments = async (files) => {
    const attachments = [];
    
    if (files) {
        for (const [key, fileArray] of Object.entries(files)) {
            const fileType = key.slice(0, -1); // Remove plural 's'
            for (const file of fileArray) {
                try {
                    const uploadResult = await uploadFileToCloudinary(file, fileType);
                    attachments.push(uploadResult);
                } catch (error) {
                    console.error(`Failed to upload ${fileType}:`, error);
                    throw error;
                }
            }
        }
    }
    
    return attachments;
};

/**
 * Delete attachments from Cloudinary
 */
const deleteAttachmentsFromCloudinary = async (attachments) => {
    if (!attachments || attachments.length === 0) return;
    
    for (const attachment of attachments) {
        try {
            await cloudinary.uploader.destroy(attachment.publicId, {
                resource_type: attachment.type === 'video' ? 'video' : 
                              attachment.type === 'image' ? 'image' : 'raw'
            });
        } catch (error) {
            console.error(`Failed to delete attachment with publicId ${attachment.publicId}:`, error);
        }
    }
};

/**
 * Delete all messages and their attachments for a chat room
 */
const deleteAllMessagesInChatRoom = async (chatRoomId) => {
    const messages = await Message.find({ chatRoomId });
    
    // Delete attachments from Cloudinary
    for (const message of messages) {
        await deleteAttachmentsFromCloudinary(message.attachments);
    }
    
    // Delete all messages
    await Message.deleteMany({ chatRoomId });
};

/**
 * Emit socket event to update chat list for participants
 */
const emitChatListUpdate = (io, participants, data) => {
    if (!io || !participants) return;
    
    // console.log('emitChatListUpdate: Participants:', participants);
    // console.log('emitChatListUpdate: Data action:', data.action);
    
    participants.forEach((participantId) => {
        const personalRoom = `user_${participantId}`;
        // console.log(`emitChatListUpdate: Emitting to room: ${personalRoom}`);
        io.to(personalRoom).emit('chatListUpdate', data);
    });
};

/**
 * Emit socket event for new chat room creation
 */
const emitNewChatRoomEvent = (io, chatRoom) => {
    if (!io) return;
    
    // console.log('emitNewChatRoomEvent: Emitting to participants:', chatRoom.participants.map(p => p._id || p));
    
    const chatRoomData = {
        ...chatRoom.toObject(),
        lastMessage: null
    };
    
    const eventData = {
        chatRoomId: chatRoom._id,
        lastMessage: null,
        action: 'create',
        chatRoom: chatRoomData
    };
    
    // Extract participant IDs correctly
    const participantIds = chatRoom.participants.map(participant => 
        participant._id || participant
    );
    
    // console.log('emitNewChatRoomEvent: Extracted participant IDs:', participantIds);
    
    emitChatListUpdate(io, participantIds, eventData);
};

/**
 * Emit socket event for chat room deletion
 */
const emitChatRoomDeletedEvent = (io, chatRoomId, participants) => {
    if (!io) return;
    
    participants.forEach((participantId) => {
        const personalRoom = `user_${participantId}`;
        
        // Emit chatRoomDeleted event
        io.to(personalRoom).emit('chatRoomDeleted', { chatRoomId });
        
        // Emit chatListUpdate for removal
        io.to(personalRoom).emit('chatListUpdate', {
            chatRoomId,
            action: 'delete',
            lastMessage: null
        });
    });
};

/**
 * Create and emit system message
 */
const createSystemMessage = async (chatRoomId, content, systemData = null) => {
    const systemMessage = new Message({
        content,
        systemData,
        sender: null,
        chatRoomId,
        messageType: 'system',
        createdAt: new Date()
    });
    
    await systemMessage.save();
    
    return {
        _id: systemMessage._id,
        content: systemMessage.content,
        sender: null,
        chatRoomId,
        messageType: 'system',
        systemData: systemMessage.systemData,
        createdAt: systemMessage.createdAt,
        attachments: []
    };
};

/**
 * Validate chat room permissions
 */
const validateChatRoomPermissions = (chatRoom, userId, action) => {
    const errors = {
        NOT_FOUND: 'Chat room not found',
        NOT_PARTICIPANT: 'You are not a participant in this chat room',
        NOT_GROUP: 'Private chat rooms cannot be ' + action,
        NOT_CREATOR: 'Only the chat room creator can ' + action + ' this chat room',
        CREATOR_CANNOT_LEAVE: 'Chat room creator cannot leave. You must delete the chat room or transfer ownership first.'
    };
    
    if (!chatRoom) {
        return { valid: false, error: errors.NOT_FOUND, status: 404 };
    }
    
    if (!chatRoom.participants.includes(userId)) {
        return { valid: false, error: errors.NOT_PARTICIPANT, status: 400 };
    }
    
    if (action === 'delete' || action === 'leave') {
        if (!chatRoom.isGroup) {
            return { valid: false, error: errors.NOT_GROUP, status: 403 };
        }
        
        if (action === 'delete' && chatRoom.createdBy.toString() !== userId.toString()) {
            return { valid: false, error: errors.NOT_CREATOR, status: 403 };
        }
        
        if (action === 'leave' && chatRoom.createdBy.toString() === userId.toString()) {
            return { valid: false, error: errors.CREATOR_CANNOT_LEAVE, status: 400 };
        }
    }
    
    return { valid: true };
};

module.exports = {
    sortChatRoomsByLastMessage,
    formatLastMessage,
    getChatRoomsWithLastMessage,
    uploadFileToCloudinary,
    processAttachments,
    deleteAttachmentsFromCloudinary,
    deleteAllMessagesInChatRoom,
    emitChatListUpdate,
    emitNewChatRoomEvent,
    emitChatRoomDeletedEvent,
    createSystemMessage,
    validateChatRoomPermissions
};
