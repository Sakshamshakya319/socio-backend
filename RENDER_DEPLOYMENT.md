# Deploying to Render

This guide explains how to deploy the Socio.io backend to Render without exposing your Google Cloud credentials.

## Prerequisites

- A Render account (https://render.com)
- Your Google Cloud credentials file (`my-project-92814-457204-c90e6bf83130.json`)
- Git repository with your code (GitHub, GitLab, etc.)

## Step 1: Encode your Google Cloud credentials

Before deploying, you need to convert your credentials file to a Base64 string:

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Run the encoding script:
   ```
   node encode_credentials.js
   ```

3. Copy the Base64 string that is output by the script.

## Step 2: Create a new Web Service in Render

1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect your Git repository
4. Configure the service:
   - **Name**: socio-backend (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install && pip install -r requirements.txt`
   - **Start Command**: `cd backend && node server.js`

## Step 3: Add environment variables

In the Render dashboard, add the following environment variables:

1. `PORT`: 10000 (or your preferred port)
2. `NODE_ENV`: production
3. `GOOGLE_CLOUD_CREDENTIALS_BASE64`: Paste the Base64 string you copied in Step 1

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically deploy your application
3. Once deployed, you can access your API at the URL provided by Render

## Troubleshooting

If you encounter issues with the Google Cloud credentials:

1. Check the logs in the Render dashboard
2. Verify that the Base64 string is correctly set in the environment variables
3. Make sure the code is properly handling the credentials from the environment variable

## Updating your deployment

When you push changes to your Git repository, Render will automatically redeploy your application.

**Important**: Never commit your Google Cloud credentials file to your Git repository. It should always be excluded in your .gitignore file.