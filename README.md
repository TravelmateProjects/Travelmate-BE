# Travelmate-BE

Travelmate-BE is the backend service for the Travelmate project. It is built using Node.js and Express.js, providing APIs for managing travel-related functionalities.

## Features
- User authentication and authorization using JWT.
- Secure password handling with bcryptjs.
- API documentation using Swagger.
- Database integration with MongoDB using Mongoose.
- Middleware support for CORS, cookie parsing, and more.

## Prerequisites
- Node.js (v16 or later)
- MongoDB

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd Travelmate-BE
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Configuration
1. Create a `.env` file in the root directory.
2. Add the following environment variables:
   ```env
   PORT=5000
   MONGO_URI=<your-mongodb-connection-string>
   JWT_SECRET=<your-jwt-secret>
   ```

## Running the Application
To start the development server:
```bash
npm start
```

The server will start on the port specified in the `.env` file (default: 3000).

## API Documentation
API documentation is available at `/api-docs` when the server is running. It is powered by Swagger UI.

## Project Structure
```
Travelmate-BE/
├── bin/                # Application entry point
├── configs/            # Configuration files
├── controllers/        # Route controllers
├── middlewares/        # Custom middleware
├── models/             # Mongoose models
├── public/             # Static files
├── routes/             # Application routes
├── tests/              # Test files
│   ├── routes/         # Route test files
│   ├── swagger/        # API documentation
│   │   ├── api-docs.yaml # OpenAPI specification
│   │   └── swaggerOptions.js # Swagger configuration
│   ├── setup.js        # Jest setup file
│   └── README.md       # Testing documentation
├── app.js              # Main application file
├── docker-compose.yml  # Docker configuration
├── Dockerfile          # Dockerfile for containerization
├── nodemon.json        # Nodemon configuration
├── package.json        # Project metadata and dependencies
```

## License
This project is licensed under the MIT License.