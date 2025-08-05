# Deployment Guide

## Frontend Deployment (Vercel)

1. **Deploy to Vercel:**
   - Connect your GitHub repository to Vercel
   - Set the root directory to `Y0natan123.github.io`
   - Set the build command to: `npm run build`
   - Set the output directory to: `client/build`

2. **Environment Variables:**
   - Add `REACT_APP_API_URL` with your backend URL
   - Example: `https://your-backend-app.railway.app`

## Backend Deployment

### Option 1: Railway (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `Y0natan123.github.io/server`
4. Add environment variables if needed
5. Deploy

### Option 2: Render
1. Go to [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `Y0natan123.github.io/server`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Deploy

### Option 3: Heroku
1. Create a `Procfile` in the server directory:
   ```
   web: npm start
   ```
2. Deploy using Heroku CLI or GitHub integration

## Local Development

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Or start separately:**
   ```bash
   # Backend
   npm run server
   
   # Frontend (in another terminal)
   npm run client
   ```

## Build Commands

- `npm run build` - Builds the React app for production
- `npm run install-all` - Installs dependencies for both client and server
- `npm run dev` - Starts both development servers 