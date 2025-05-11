# Deploying Socio.io Backend to Render

This guide provides step-by-step instructions for deploying the Socio.io backend to Render.

## Prerequisites

1. A [Render](https://render.com/) account
2. Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Deployment Steps

### 1. Create a New Web Service

1. Log in to your Render account
2. Click on the "New +" button in the top right corner
3. Select "Web Service" from the dropdown menu

### 2. Connect Your Repository

1. Connect your GitHub/GitLab account if you haven't already
2. Select the repository containing your Socio.io backend code
3. If your backend is in a subdirectory, you'll specify this later

### 3. Configure Your Web Service

Fill in the following details:

- **Name**: `socio-io-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the region closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: If your backend is in a subdirectory (e.g., `/backend`), enter it here
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Select the Free plan for testing, or a paid plan for production

### 4. Configure Environment Variables

Click on the "Advanced" button and add the following environment variables:

- `NODE_ENV`: `production`
- `PORT`: `10000` (Render will automatically use this port)

Add any other environment variables your application needs.

### 5. Deploy Your Service

1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. Wait for the deployment to complete (this may take a few minutes)

### 6. Verify Your Deployment

1. Once deployment is complete, Render will provide you with a URL (e.g., `https://socio-io-backend.onrender.com`)
2. Test your API by making a request to `https://socio-io-backend.onrender.com/ping`
3. You should receive a response: `{"status":"ok","message":"pong"}`

### 7. Update Your Extension

Update your browser extension to use the new backend URL:

1. Open your extension code
2. Find where the backend URL is defined
3. Replace the local URL (e.g., `http://localhost:5000`) with your Render URL (e.g., `https://socio-io-backend.onrender.com`)
4. Rebuild and redeploy your extension

## Troubleshooting

If you encounter issues with your deployment, check the following:

1. **Logs**: Check the logs in the Render dashboard for error messages
2. **Environment Variables**: Ensure all required environment variables are set
3. **Dependencies**: Make sure all dependencies are listed in your `package.json` file
4. **Port**: Ensure your application is listening on the port provided by Render (`process.env.PORT`)
5. **CORS**: If you're getting CORS errors, make sure your backend is configured to allow requests from your extension

## Scaling Your Application

If you need to scale your application:

1. Upgrade to a paid plan on Render
2. Configure auto-scaling in the Render dashboard
3. Consider adding a database if you need to store data persistently

## Monitoring

Render provides basic monitoring for your application. For more advanced monitoring:

1. Set up logging to a service like Loggly or Papertrail
2. Implement health checks in your application
3. Set up alerts for when your application goes down

## Support

If you need help with your deployment, you can:

1. Check the [Render documentation](https://render.com/docs)
2. Contact Render support through their dashboard
3. Ask for help in the Render community forums