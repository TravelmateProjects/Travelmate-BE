const request = require('supertest');
const express = require('express');
const chatRoutes = require('../../routes/chatRouters');

// Mock dependencies
jest.mock('../../controllers/chatController');
jest.mock('../../middlewares/authMiddleware');
jest.mock('multer');

const chatController = require('../../controllers/chatController');
const { verifyToken, authorizeRole } = require('../../middlewares/authMiddleware');
const multer = require('multer');

describe('Chat Routes', () => {
    let app;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create Express app for testing
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));

        // Mock middleware to always pass
        verifyToken.mockImplementation((req, res, next) => {
            req.account = { userId: 'mockUserId123' };
            next();
        });

        authorizeRole.mockImplementation((role) => (req, res, next) => {
            next();
        });

        // Mock multer upload middleware
        const mockUpload = {
            fields: jest.fn().mockReturnValue((req, res, next) => {
                req.files = {
                    images: [],
                    videos: [],
                    files: []
                };
                next();
            })
        };
        multer.mockReturnValue(mockUpload);

        // Use the chat routes
        app.use('/api/chat', chatRoutes);
    });

    describe('GET /', () => {
        it('should get user chat rooms successfully', async () => {
            const mockChatRooms = [
                { _id: '1', name: 'Room 1', participants: [] },
                { _id: '2', name: 'Room 2', participants: [] }
            ];

            chatController.getChatRooms.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Get chatrooms successful',
                    data: mockChatRooms
                });
            });

            const response = await request(app)
                .get('/api/chat')
                .expect(200);

            expect(response.body.message).toBe('Get chatrooms successful');
            expect(response.body.data).toEqual(mockChatRooms);
            expect(chatController.getChatRooms).toHaveBeenCalledTimes(1);
        });

        it('should handle error when getting chat rooms', async () => {
            chatController.getChatRooms.mockImplementation((req, res) => {
                res.status(500).json({
                    message: 'Error fetching user chat rooms',
                    error: 'Database connection failed'
                });
            });

            const response = await request(app)
                .get('/api/chat')
                .expect(500);

            expect(response.body.message).toBe('Error fetching user chat rooms');
        });
    });

    describe('GET /:id', () => {
        it('should get chat room by ID successfully', async () => {
            const mockChatRoom = {
                _id: 'chatRoom123',
                name: 'Test Room',
                participants: []
            };

            chatController.getChatRoomById.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Get chatrooms successful',
                    data: mockChatRoom
                });
            });

            const response = await request(app)
                .get('/api/chat/chatRoom123')
                .expect(200);

            expect(response.body.data).toEqual(mockChatRoom);
            expect(chatController.getChatRoomById).toHaveBeenCalledTimes(1);
        });

        it('should handle chat room not found', async () => {
            chatController.getChatRoomById.mockImplementation((req, res) => {
                res.status(404).json({
                    message: 'Chat room not found'
                });
            });

            const response = await request(app)
                .get('/api/chat/nonexistent')
                .expect(404);

            expect(response.body.message).toBe('Chat room not found');
        });
    });

    describe('POST /', () => {
        it('should create chat room successfully', async () => {
            const newChatRoom = {
                name: 'New Chat Room',
                participants: ['user1', 'user2']
            };

            const mockCreatedRoom = {
                _id: 'newRoom123',
                ...newChatRoom,
                createdBy: 'mockUserId123'
            };

            chatController.createChatRoom.mockImplementation((req, res) => {
                res.status(201).json({
                    message: 'Create chatroom successful',
                    data: mockCreatedRoom
                });
            });

            const response = await request(app)
                .post('/api/chat')
                .send(newChatRoom)
                .expect(201);

            expect(response.body.message).toBe('Create chatroom successful');
            expect(response.body.data).toEqual(mockCreatedRoom);
            expect(chatController.createChatRoom).toHaveBeenCalledTimes(1);
        });

        it('should handle validation error when creating chat room', async () => {
            chatController.createChatRoom.mockImplementation((req, res) => {
                res.status(400).json({
                    message: 'Validation error',
                    error: 'Name is required'
                });
            });

            const response = await request(app)
                .post('/api/chat')
                .send({})
                .expect(400);

            expect(response.body.message).toBe('Validation error');
        });
    });

    describe('POST /chatAi', () => {
        it('should handle AI chat successfully', async () => {
            const mockAIResponse = {
                reply: 'Hello! How can I help you with travel planning?',
                conversationId: 'conv123'
            };

            chatController.handleChatAI.mockImplementation((req, res) => {
                res.status(200).json(mockAIResponse);
            });

            const response = await request(app)
                .post('/api/chat/chatAi')
                .send({
                    message: 'Hello',
                    conversationId: 'conv123'
                })
                .expect(200);

            expect(response.body).toEqual(mockAIResponse);
            expect(chatController.handleChatAI).toHaveBeenCalledTimes(1);
        });

        it('should handle empty message in AI chat', async () => {
            chatController.handleChatAI.mockImplementation((req, res) => {
                res.status(400).json({
                    reply: 'Please enter a message.'
                });
            });

            const response = await request(app)
                .post('/api/chat/chatAi')
                .send({ message: '' })
                .expect(400);

            expect(response.body.reply).toBe('Please enter a message.');
        });
    });

    describe('POST /clear-chat-ai', () => {
        it('should clear AI conversation successfully', async () => {
            chatController.clearChatAI.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Conversation cleared successfully'
                });
            });

            const response = await request(app)
                .post('/api/chat/clear-chat-ai')
                .send({ conversationId: 'conv123' })
                .expect(200);

            expect(response.body.message).toBe('Conversation cleared successfully');
            expect(chatController.clearChatAI).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /:id/travelhistory', () => {
        it('should create travel history successfully', async () => {
            const travelData = {
                plan: 'Visit Da Nang',
                destination: 'Da Nang',
                arrivalDate: '2025-08-01',
                returnDate: '2025-08-05'
            };

            const mockTravelHistory = {
                _id: 'travel123',
                ...travelData,
                creatorId: 'mockUserId123'
            };

            chatController.createTravelHistory.mockImplementation((req, res) => {
                res.status(201).json({
                    message: 'Travel history created successfully',
                    data: mockTravelHistory
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/travelhistory')
                .send(travelData)
                .expect(201);

            expect(response.body.message).toBe('Travel history created successfully');
            expect(response.body.data).toEqual(mockTravelHistory);
        });

        it('should handle missing required fields for travel history', async () => {
            chatController.createTravelHistory.mockImplementation((req, res) => {
                res.status(400).json({
                    message: 'Missing required fields',
                    error: 'Destination is required'
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/travelhistory')
                .send({ plan: 'Incomplete plan' })
                .expect(400);

            expect(response.body.message).toBe('Missing required fields');
        });
    });

    describe('POST /:id/message', () => {
        it('should send message successfully', async () => {
            const messageData = { content: 'Hello everyone!' };
            const mockMessage = {
                _id: 'msg123',
                content: 'Hello everyone!',
                sender: 'mockUserId123',
                chatRoomId: 'chatRoom123'
            };

            chatController.sendMessage.mockImplementation((req, res) => {
                res.status(201).json({
                    message: 'Message sent successfully',
                    data: mockMessage
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/message')
                .send(messageData)
                .expect(201);

            expect(response.body.message).toBe('Message sent successfully');
            expect(response.body.data).toEqual(mockMessage);
        });

        it('should handle file uploads in message', async () => {
            const mockMessage = {
                _id: 'msg123',
                content: 'Check out these photos!',
                sender: 'mockUserId123',
                chatRoomId: 'chatRoom123',
                attachments: ['image1.jpg', 'image2.jpg']
            };

            chatController.sendMessage.mockImplementation((req, res) => {
                res.status(201).json({
                    message: 'Message sent successfully',
                    data: mockMessage
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/message')
                .field('content', 'Check out these photos!')
                .attach('images', Buffer.from('fake image'), 'image1.jpg')
                .attach('images', Buffer.from('fake image'), 'image2.jpg')
                .expect(201);

            expect(response.body.data).toEqual(mockMessage);
        });
    });

    describe('GET /:id/messages', () => {
        it('should get messages successfully', async () => {
            const mockMessages = [
                { _id: 'msg1', content: 'Hello', sender: { fullName: 'User 1' } },
                { _id: 'msg2', content: 'Hi there', sender: { fullName: 'User 2' } }
            ];

            chatController.getMessages.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Messages retrieved successfully',
                    data: mockMessages
                });
            });

            const response = await request(app)
                .get('/api/chat/chatRoom123/messages')
                .expect(200);

            expect(response.body.data).toEqual(mockMessages);
            expect(chatController.getMessages).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /:id/leave', () => {
        it('should leave chat room successfully', async () => {
            chatController.leaveChatRoom.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Left chat room successfully'
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/leave')
                .expect(200);

            expect(response.body.message).toBe('Left chat room successfully');
            expect(chatController.leaveChatRoom).toHaveBeenCalledTimes(1);
        });
    });

    describe('DELETE /:id', () => {
        it('should delete chat room successfully', async () => {
            chatController.deleteChatRoom.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Chat room and its messages deleted successfully'
                });
            });

            const response = await request(app)
                .delete('/api/chat/chatRoom123')
                .expect(200);

            expect(response.body.message).toBe('Chat room and its messages deleted successfully');
            expect(chatController.deleteChatRoom).toHaveBeenCalledTimes(1);
        });

        it('should handle unauthorized deletion', async () => {
            chatController.deleteChatRoom.mockImplementation((req, res) => {
                res.status(403).json({
                    message: 'Only the creator can delete this chat room'
                });
            });

            const response = await request(app)
                .delete('/api/chat/chatRoom123')
                .expect(403);

            expect(response.body.message).toBe('Only the creator can delete this chat room');
        });
    });

    describe('DELETE /:id/message/:messageId', () => {
        it('should delete message successfully', async () => {
            chatController.deleteMessage.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Message and its attachments deleted successfully'
                });
            });

            const response = await request(app)
                .delete('/api/chat/chatRoom123/message/msg123')
                .expect(200);

            expect(response.body.message).toBe('Message and its attachments deleted successfully');
            expect(chatController.deleteMessage).toHaveBeenCalledTimes(1);
        });

        it('should handle message not found', async () => {
            chatController.deleteMessage.mockImplementation((req, res) => {
                res.status(404).json({
                    message: 'Message not found'
                });
            });

            const response = await request(app)
                .delete('/api/chat/chatRoom123/message/nonexistent')
                .expect(404);

            expect(response.body.message).toBe('Message not found');
        });
    });

    describe('POST /:id/add-participant', () => {
        it('should add participant successfully', async () => {
            const participantData = { userIdsToAdd: ['user123', 'user456'] };

            chatController.addParticipant.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Participants added successfully',
                    data: { _id: 'chatRoom123', participants: ['existingUser', 'user123', 'user456'] }
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/add-participant')
                .send(participantData)
                .expect(200);

            expect(response.body.message).toBe('Participants added successfully');
            expect(chatController.addParticipant).toHaveBeenCalledTimes(1);
        });

        it('should handle adding existing participant', async () => {
            chatController.addParticipant.mockImplementation((req, res) => {
                res.status(400).json({
                    message: 'All users are already in the group'
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/add-participant')
                .send({ userIdsToAdd: ['existingUser'] })
                .expect(400);

            expect(response.body.message).toBe('All users are already in the group');
        });
    });

    describe('POST /:id/remove-participant', () => {
        it('should remove participant successfully', async () => {
            const removeData = { userIdToRemove: 'user123' };

            chatController.removeParticipant.mockImplementation((req, res) => {
                res.status(200).json({
                    message: 'Participant removed successfully',
                    data: { _id: 'chatRoom123', participants: ['existingUser'] }
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/remove-participant')
                .send(removeData)
                .expect(200);

            expect(response.body.message).toBe('Participant removed successfully');
            expect(chatController.removeParticipant).toHaveBeenCalledTimes(1);
        });

        it('should handle unauthorized participant removal', async () => {
            chatController.removeParticipant.mockImplementation((req, res) => {
                res.status(403).json({
                    message: 'Only the creator can remove participants'
                });
            });

            const response = await request(app)
                .post('/api/chat/chatRoom123/remove-participant')
                .send({ userIdToRemove: 'user123' })
                .expect(403);

            expect(response.body.message).toBe('Only the creator can remove participants');
        });
    });

    describe('Middleware Integration', () => {
        it('should ensure verifyToken is called for all protected routes', async () => {
            await request(app).get('/api/chat');
            await request(app).post('/api/chat');
            await request(app).post('/api/chat/chatAi');

            expect(verifyToken).toHaveBeenCalledTimes(3);
        });

        it('should ensure authorizeRole is called for all protected routes', async () => {
            await request(app).get('/api/chat');
            await request(app).post('/api/chat');
            await request(app).post('/api/chat/chatAi');

            expect(authorizeRole).toHaveBeenCalledTimes(3);
            expect(authorizeRole).toHaveBeenCalledWith('user');
        });
    });
});
