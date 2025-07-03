# Testing Guide for Chat Router

This comprehensive testing guide covers unit tests for the chat routing functionality in the Travelmate Backend API.

## 📋 Table of Contents
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Mock Strategy](#mock-strategy)
- [Test Coverage](#test-coverage)
- [API Endpoints Tested](#api-endpoints-tested)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## ⚙️ Configuration

Jest configuration is located at: `configs/jest.config.json`

### Key Configuration Settings:
- **Test Environment**: Node.js
- **Test Pattern**: `**/tests/**/*.test.js` and `**/tests/**/*.spec.js`
- **Coverage Directory**: `coverage/`
- **Setup File**: `tests/setup.js`
- **Mock Strategy**: Clear mocks before each test

## 🚀 Running Tests

### Basic Commands

#### Run all tests
```bash
npm test
```
Executes the complete test suite with Jest configuration.

#### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```
Monitors file changes and automatically reruns relevant tests.

#### Run tests with coverage report
```bash
npm run test:coverage
```
Generates detailed coverage reports in text, HTML, and LCOV formats.

#### Run only route tests
```bash
npm run test:routes
```
Executes only the route-specific test files.

### Advanced Usage

#### Run specific test file
```bash
npx jest tests/routes/chatRouters.test.js --config=configs/jest.config.json
```

#### Run tests with verbose output
```bash
npx jest --verbose --config=configs/jest.config.json
```

#### Run tests matching a pattern
```bash
npx jest --testNamePattern="should create chat room" --config=configs/jest.config.json
```

## 🏗️ Test Structure

### Main Test File: `tests/routes/chatRouters.test.js`

The test suite is organized into logical groups covering all chat-related endpoints:

#### 1. **GET /** - Retrieve User's Chat Rooms
- **Success Case**: Returns user's chat rooms with proper authentication
- **Error Case**: Handles database connection failures
- **Middleware**: Verifies token and role authorization

#### 2. **GET /:id** - Get Chat Room by ID
- **Success Case**: Returns specific chat room details
- **Error Case**: Handles non-existent chat room (404)
- **Validation**: Ensures proper ID format

#### 3. **POST /** - Create New Chat Room
- **Success Case**: Creates chat room with participants
- **Error Case**: Handles validation errors for missing fields
- **Business Logic**: Automatically sets group chat properties

#### 4. **POST /chatAi** - AI Chat Integration
- **Success Case**: Processes AI chat requests with conversation context
- **Error Case**: Handles empty messages and API failures
- **Language Detection**: Tests Vietnamese and English language processing

#### 5. **POST /clear-chat-ai** - Clear AI Conversation
- **Success Case**: Clears conversation history
- **Error Case**: Handles invalid conversation IDs

#### 6. **POST /:id/travelhistory** - Create Travel History
- **Success Case**: Creates travel plans linked to chat rooms
- **Error Case**: Validates required fields (destination, dates)
- **Integration**: Links travel history with chat participants

#### 7. **POST /:id/message** - Send Messages
- **Success Case**: Sends text messages and file attachments
- **File Upload**: Tests image, video, and document uploads
- **Error Case**: Handles invalid chat room IDs

#### 8. **GET /:id/messages** - Retrieve Messages
- **Success Case**: Returns paginated message history
- **Population**: Tests proper sender information population
- **Sorting**: Verifies chronological message ordering

#### 9. **POST /:id/leave** - Leave Chat Room
- **Success Case**: Removes user from chat room participants
- **System Messages**: Creates appropriate leave notifications
- **Socket Events**: Tests real-time updates

#### 10. **DELETE /:id** - Delete Chat Room
- **Success Case**: Deletes chat room and associated data
- **Authorization**: Only chat room creator can delete
- **Cleanup**: Removes messages, notifications, and attachments

#### 11. **DELETE /:id/message/:messageId** - Delete Message
- **Success Case**: Deletes specific messages
- **Ownership**: Validates message sender permissions
- **Cleanup**: Removes associated file attachments

#### 12. **POST /:id/add-participant** - Add Participants
- **Success Case**: Adds multiple users to chat room
- **Validation**: Prevents duplicate participants
- **Notifications**: Creates system messages for additions

#### 13. **POST /:id/remove-participant** - Remove Participants
- **Success Case**: Removes users from chat room
- **Authorization**: Only creator can remove participants
- **System Messages**: Notifies about user removal

#### 14. **Middleware Integration Testing**
- **Authentication**: Verifies token validation on all protected routes
- **Authorization**: Tests role-based access control
- **Error Handling**: Tests middleware error responses

## 🎭 Mock Strategy

### Comprehensive Mocking Approach

#### Controllers
- **Complete Isolation**: All `chatController` functions are mocked
- **Response Simulation**: Mock implementations return realistic API responses
- **Error Simulation**: Mocked error scenarios for comprehensive testing

#### Middleware
- **Authentication Bypass**: `verifyToken` mock provides test user context
- **Role Authorization**: `authorizeRole` mock simulates user permissions
- **Request Enhancement**: Adds `req.account.userId` for authenticated requests

#### File Upload Handling
- **Multer Mocking**: Upload middleware simulated without actual file processing
- **File Types**: Supports images, videos, and documents
- **Metadata Simulation**: Provides file information for testing

#### Database Abstraction
- **No Real Database**: All database operations are mocked
- **Data Consistency**: Mock responses maintain realistic data structures
- **Performance**: Tests run quickly without database I/O

## 📊 Test Coverage

### Coverage Reports

After running `npm run test:coverage`, examine the `coverage/` directory:

#### Coverage Types
- **Line Coverage**: Percentage of code lines executed
- **Function Coverage**: Percentage of functions called
- **Branch Coverage**: Percentage of conditional branches tested
- **Statement Coverage**: Percentage of statements executed

#### Coverage Targets
- **Routes**: 100% line and function coverage
- **Error Paths**: All error conditions tested
- **Edge Cases**: Boundary conditions and invalid inputs

#### Coverage Analysis
```bash
# View coverage in terminal
npm run test:coverage

# Open HTML coverage report
# Navigate to coverage/lcov-report/index.html in browser
```

## 🔗 API Endpoints Tested

### Chat Management
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/` | List user's chat rooms | ✅ |
| GET | `/:id` | Get chat room details | ✅ |
| POST | `/` | Create new chat room | ✅ |
| DELETE | `/:id` | Delete chat room | ✅ |

### Messaging
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/:id/message` | Send message with files | ✅ |
| GET | `/:id/messages` | Get message history | ✅ |
| DELETE | `/:id/message/:messageId` | Delete specific message | ✅ |

### Participant Management
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/:id/add-participant` | Add users to chat | ✅ |
| POST | `/:id/remove-participant` | Remove users from chat | ✅ |
| POST | `/:id/leave` | Leave chat room | ✅ |

### AI Integration
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/chatAi` | Chat with AI assistant | ✅ |
| POST | `/clear-chat-ai` | Clear AI conversation | ✅ |

### Travel Integration
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/:id/travelhistory` | Create travel plan | ✅ |

## ⚠️ Error Handling

### HTTP Status Code Testing

#### ✅ Success Responses
- **200 OK**: Successful data retrieval
- **201 Created**: Successful resource creation
- **204 No Content**: Successful deletion

#### ❌ Client Error Responses
- **400 Bad Request**: Invalid input data, missing required fields
- **401 Unauthorized**: Invalid or missing authentication token
- **403 Forbidden**: Insufficient permissions for action
- **404 Not Found**: Requested resource doesn't exist
- **409 Conflict**: Resource already exists or conflict state

#### 🔥 Server Error Responses
- **500 Internal Server Error**: Database errors, external API failures

### Error Scenario Coverage
- **Validation Errors**: Missing fields, invalid data types
- **Authentication Failures**: Expired tokens, malformed tokens
- **Authorization Failures**: Insufficient permissions
- **Resource Conflicts**: Duplicate data, constraint violations
- **External Service Failures**: AI API downtime, file upload issues

## 📚 Best Practices

### Test Organization
1. **Descriptive Names**: Clear, specific test descriptions
2. **Logical Grouping**: Related tests grouped by functionality
3. **Setup/Teardown**: Proper test isolation and cleanup
4. **Mock Management**: Consistent mock reset and configuration

### Code Quality
1. **DRY Principle**: Reusable test utilities and helpers
2. **Readability**: Clear assertions and error messages
3. **Maintainability**: Easy to update when APIs change
4. **Documentation**: Self-documenting test cases

### Performance
1. **Fast Execution**: Mocked dependencies for speed
2. **Parallel Execution**: Tests run independently
3. **Resource Management**: Proper cleanup of test resources
4. **Minimal I/O**: No actual database or file operations

### Security Testing
1. **Authentication**: All protected routes require valid tokens
2. **Authorization**: Role-based access control verified
3. **Input Validation**: Malicious input handling tested
4. **Data Sanitization**: XSS and injection prevention

## 🔧 Development Workflow

### Adding New Tests
1. **Create Test File**: Follow naming convention `*.test.js`
2. **Mock Dependencies**: Use Jest mocking for external dependencies
3. **Write Test Cases**: Cover success and error scenarios
4. **Run Tests**: Verify all tests pass
5. **Check Coverage**: Ensure adequate code coverage

### Debugging Tests
```bash
# Run with debug output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="specific test name"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Continuous Integration
- **Pre-commit Hooks**: Run tests before commits
- **Pull Request Checks**: Automated test execution
- **Coverage Thresholds**: Maintain minimum coverage levels
- **Performance Monitoring**: Track test execution time

## 📝 Notes

### Important Considerations
1. **Mock Data Isolation**: All test data is mocked, no real database impact
2. **Test Independence**: Each test runs in isolation without dependencies
3. **Clean State**: Mocks are reset before each test execution
4. **HTTP Simulation**: Uses Supertest for realistic HTTP request testing
5. **Environment Separation**: Test environment completely isolated from production

### Troubleshooting
- **Port Conflicts**: Tests use random ports to avoid conflicts
- **Mock Issues**: Check mock implementations match actual API contracts
- **Timeout Problems**: Increase Jest timeout for slower operations
- **Coverage Gaps**: Use coverage reports to identify untested code paths
