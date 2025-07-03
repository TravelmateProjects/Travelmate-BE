# Swagger Documentation (Tests)

This folder contains the OpenAPI/Swagger documentation used for testing and development of the Travelmate API.

## 📁 Files

### `api-docs.yaml`
- **Purpose**: OpenAPI 3.0.3 specification for the Travelmate API
- **Format**: YAML
- **Content**: Complete API documentation including endpoints, schemas, and examples
- **Usage**: Testing and development reference

### `swaggerOptions.js`
- **Purpose**: Configuration file for Swagger integration in testing environment
- **Function**: Loads and exports the YAML documentation for use in Express app
- **Usage**: Imported by `app.js` to serve Swagger UI at `/api-docs`

## 🚀 Access Documentation

The Swagger documentation is served at:
- **Local Development**: `http://localhost:5000/api-docs`
- **Swagger UI**: Interactive API documentation interface

## 📝 Current API Coverage

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication

### Profile Management
- `PUT /users/updateProfile` - Update user profile information
- `PUT /users/updateCoverImage` - Update user cover image  
- `PUT /users/updateAvatar` - Update user avatar

### Data Models & Schemas
Complete schema definitions for all entities:
- **Account** - User account information
- **User** - User profile data
- **ChatRoom** - Chat room entity
- **Message** - Chat messages
- **TravelHistory** - Travel plans and history
- **Notification** - System notifications
- **Rating** - User ratings and reviews
- **UserAlbum** - Photo albums
- **UserBlog** - User blog posts
- **StatusReaction** - Social reactions
- And more...

## 🔧 Development Workflow

### Adding New API Endpoints
1. Update `api-docs.yaml` with new paths and schemas
2. Follow OpenAPI 3.0.3 specification standards
3. Include comprehensive examples and descriptions
4. Test documentation in Swagger UI
5. Validate YAML syntax

### Best Practices
- **Consistent Naming**: Use clear, descriptive endpoint names
- **Proper HTTP Methods**: GET, POST, PUT, DELETE appropriately
- **Status Codes**: Use standard HTTP status codes
- **Examples**: Provide realistic request/response examples
- **Security**: Document authentication requirements

## 📖 OpenAPI Standards

- **Version**: OpenAPI 3.0.3
- **Authentication**: Bearer JWT tokens (`bearerAuth`)
- **Response Format**: JSON
- **Error Handling**: Standard HTTP status codes
- **Documentation**: Self-documenting with examples

## 🧪 Testing Integration

This documentation is used for:
- **API Testing**: Reference for test case development
- **Development**: Developer reference during implementation
- **Integration**: Third-party service integration
- **Validation**: API contract validation

## 📋 Maintenance Notes

- Keep documentation in sync with actual API implementation
- Update schemas when models change
- Test all examples in Swagger UI
- Validate YAML syntax before committing
- Review security documentation regularly
