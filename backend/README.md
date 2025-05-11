# Socio.io Backend

This is the Node.js backend for the Socio.io browser extension, providing content moderation APIs for text and images.

## Features

- Text content filtering with hate speech and profanity detection
- Sensitive information detection (PII, financial data, etc.)
- Image URL filtering
- Content encryption/decryption for privacy
- Server status monitoring

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (usually comes with Node.js)

### Installation

1. Clone the repository
2. Navigate to the backend directory:

```bash
cd backend
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file with your configuration:

```
PORT=5000
```

### Running the Backend

#### Development Mode

```bash
npm run dev
```

This starts the server with nodemon, which automatically restarts when you make changes.

#### Production Mode

```bash
npm start
```

### Testing

Run the automated tests to verify the backend functionality:

```bash
npm test
```

### Building for Deployment

```bash
npm run build
```

This creates a `build` directory with all the files needed for deployment.

### Deployment

```bash
npm run deploy
```

This script guides you through the deployment process to Render.

## API Endpoints

### Health Check

- `GET /ping` - Check if the server is running
  - Response: `{"status":"ok","message":"pong"}`

### Content Filtering

- `POST /filter/text` - Filter text content
  - Request body: `{"text":"Text to filter"}`
  - Response: 
    ```json
    {
      "filtered": true/false,
      "reason": "Reason for filtering",
      "original": "Original text",
      "modified": "Modified text with sensitive content masked",
      "encrypted": "Encrypted original content"
    }
    ```

- `POST /filter/image` - Filter image content
  - Request body: `{"url":"https://example.com/image.jpg"}`
  - Response:
    ```json
    {
      "filtered": true/false,
      "reason": "Reason for filtering",
      "original": "Original image URL",
      "modified": "Placeholder image URL if filtered",
      "encrypted": "Encrypted original URL if filtered"
    }
    ```

### Content Decryption

- `POST /decrypt` - Decrypt previously filtered content
  - Request body: `{"encrypted":"Encrypted content string"}`
  - Response: `{"decrypted":"Original content"}`

### Server Status

- `GET /status` - Get server status and statistics
  - Response:
    ```json
    {
      "status": "running",
      "stats": {
        "text_filtered": 0,
        "images_filtered": 0,
        "total_requests": 0
      },
      "version": "1.0.0"
    }
    ```

## Deployment

This backend is designed to be easily deployed to platforms like Render. See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed deployment instructions.

## Customization

### Text Filtering

You can customize the text filtering patterns in `text_analysis.js`:

- `HATE_SPEECH_KEYWORDS` - Patterns for detecting hate speech
- `PROFANITY_PATTERNS` - Patterns for detecting profanity
- `SENSITIVE_PATTERNS` - Patterns for detecting sensitive information

### Image Filtering

You can customize the image filtering in `content_filter.js`:

- `inappropriateUrlPatterns` - URL patterns to filter

## Integration with Browser Extension

To integrate this backend with your browser extension:

1. Deploy the backend to Render or another hosting service
2. Update your extension's configuration to use the deployed backend URL
3. Make API calls from your extension to the backend endpoints

## License

[MIT](LICENSE)