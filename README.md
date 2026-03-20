# HelloVideos Backend

A Node.js + Express backend for a video platform with authentication, media uploads, engagement features, and dashboard analytics.

## Tech Stack

- Node.js (ES Modules)
- Express
- MongoDB + Mongoose
- JWT Authentication
- Cloudinary (media storage)
- Multer (multipart uploads)

## Features

- User authentication and profile management
- Video upload and management
- Comments, likes, and subscriptions
- Tweets and playlists
- Dashboard aggregation endpoints
- Healthcheck endpoint
- Postman collection for API testing

## Project Structure

- src/index.js: server entry point
- src/app.js: express app and middleware wiring
- src/db/db.js: MongoDB connection
- src/controllers: request handlers
- src/models: Mongoose schemas and model logic
- src/routes: API route modules
- src/middlewares: auth and upload middlewares
- src/utils: shared helpers (API responses, errors, cloudinary, async wrapper)
- postman: API collection and environment

## Prerequisites

- Node.js 18+
- npm
- MongoDB cluster or instance
- Cloudinary account

## Environment Variables

Create a .env file in the project root with the following values:

- PORT=8000
- CORS_ORIGIN=http://localhost:3000
- MONGODB_URI=<your_mongodb_connection_string>
- ACCESS_TOKEN_SECRET=<strong_random_secret>
- ACCESS_TOKEN_EXPIRY=1d
- REFRESH_TOKEN_SECRET=<strong_random_secret>
- REFRESH_TOKEN_EXPIRY=10d
- CLOUDINARY_CLOUD_NAME=<your_cloud_name>
- CLOUDINARY_API_KEY=<your_api_key>
- CLOUDINARY_API_SECRET=<your_api_secret>

Important:
- Do not commit .env
- Rotate credentials if they were ever exposed

## Installation

1. Install dependencies

   npm install

2. Configure environment

   Copy .env.sample to .env and fill all required values.

3. Start development server

   npm run dev

The API will run on http://localhost:8000 by default.

## Available Script

- npm run dev: start server with nodemon

## API Collections

Use the Postman files in the postman folder:

- HelloVideos.postman_collection.json
- HelloVideos.postman_environment.json

## Healthcheck

Use the healthcheck route to verify service status.

## License

ISC
