# Deploying Socio.io Backend to Render

This guide provides step-by-step instructions for deploying the Socio.io backend to Render.

## Prerequisites

1. Node.js (version 14 or higher)
2. npm (usually comes with Node.js)
3. Git
4. A [Render](https://render.com/) account
5. A Git repository (GitHub, GitLab, etc.)

## Automated Build and Deployment

We've created scripts to automate the build and deployment process:

### 1. Build Script

The `build.js` script automates the build process:

```bash
# Run the build script
npm run build
```

This script:
- Validates your environment
- Installs dependencies
- Creates necessary directories
- Copies required files to the build directory
- Generates build artifacts

### 2. Deployment Script

The `deploy.sh` script helps prepare your application for deployment:

```bash
# Run the deployment script
npm run deploy
```

This script:
- Checks prerequisites
- Builds the application
- Prepares deployment files
- Provides instructions for deploying to Render

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### 1. Prepare Your Code

1. Make sure your code is in a Git repository
2. Push your code to GitHub or GitLab:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create a New Web Service on Render

1. Log in to your Render account
2. Click on the "New +" button in the top right corner
3. Select "Web Service" from the dropdown menu

### 3. Connect Your Repository

1. Connect your GitHub/GitLab account if you haven't already
2. Select the repository containing your Socio.io backend code
3. If your backend is in a subdirectory, you'll specify this later

### 4. Configure Your Web Service

Fill in the following details:

- **Name**: `socio-io-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the region closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: If your backend is in a subdirectory (e.g., `/backend`), enter it here
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Select the Free plan for testing, or a paid plan for production

### 5. Configure Environment Variables

Click on the "Advanced" button and add the following environment variables:

- `NODE_ENV`: `production`
- `PORT`: `10000` (Render will automatically use this port)

Add any other environment variables your application needs.

### 6. Deploy Your Service

1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. Wait for the deployment to complete (this may take a few minutes)

### 7. Verify Your Deployment

1. Once deployment is complete, Render will provide you with a URL (e.g., `https://socio-io-backend.onrender.com`)
2. Test your API by making a request to `https://socio-io-backend.onrender.com/ping`
3. You should receive a response: `{"status":"ok","message":"pong"}`

## Updating Your Extension

After deploying your backend, update your browser extension to use the new backend URL:

1. Open your extension code
2. Find where the backend URL is defined (likely in a configuration file)
3. Replace the local URL (e.g., `http://localhost:5000`) with your Render URL (e.g., `https://socio-io-backend.onrender.com`)
4. Rebuild and redeploy your extension

## Testing Your API Endpoints

You can test your API endpoints using tools like cURL, Postman, or a web browser:

### Ping Endpoint

```bash
curl https://your-app-name.onrender.com/ping
```

Expected response:
```json
{"status":"ok","message":"pong"}
```

### Text Filtering Endpoint

```bash
curl -X POST https://your-app-name.onrender.com/filter/text \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a test message"}'
```

### Image Filtering Endpoint

```bash
curl -X POST https://your-app-name.onrender.com/filter/image \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/image.jpg"}'
```

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