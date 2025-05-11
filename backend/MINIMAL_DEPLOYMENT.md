# Minimal Deployment Guide for Socio.io Backend

This guide provides instructions for deploying the minimal version of the Socio.io backend to Render.

## Files to Deploy

For a minimal deployment, you only need these files:

1. `index.js` - Entry point
2. `server-minimal.js` - Minimal server implementation
3. `package-minimal.json` - Renamed to `package.json` before deployment

## Deployment Steps

### 1. Prepare Your Files

1. Rename `package-minimal.json` to `package.json`:
   ```bash
   cp package-minimal.json package.json
   ```

2. Make sure you have these files in your deployment directory:
   - `index.js`
   - `server-minimal.js`
   - `package.json` (the renamed minimal version)

### 2. Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `socio-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. Add environment variables:
   - `PORT`: `10000`

5. Click "Create Web Service"

### 3. Verify Deployment

1. Once deployed, visit your Render URL (e.g., `https://socio-backend-ipzg.onrender.com/ping`)
2. You should see: `{"status":"ok","message":"pong"}`

## Troubleshooting

If you encounter issues:

1. Check Render logs for errors
2. Make sure all required files are included
3. Verify that the package.json includes the necessary dependencies
4. Try redeploying with the "Clear build cache & deploy" option

## API Endpoints

The minimal server provides these endpoints:

- `GET /ping` - Check if the server is running
- `POST /filter/text` - Filter text content
- `POST /filter/image` - Filter image content
- `POST /decrypt` - Decrypt filtered content
- `GET /status` - Get server status