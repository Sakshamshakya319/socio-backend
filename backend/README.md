# Socio.io Backend

This is the Node.js backend for the Socio.io browser extension, providing content moderation APIs for text and images.

## Features

- Text content filtering
- Image URL filtering
- Content encryption/decryption
- Server status monitoring

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your configuration (see `.env.example`)

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

- `GET /ping` - Check if the server is running
- `POST /filter/text` - Filter text content
- `POST /filter/image` - Filter image content
- `POST /decrypt` - Decrypt previously filtered content
- `GET /status` - Get server status

## Deployment

This backend is designed to be easily deployed to platforms like Render.

### Deploying to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Add Environment Variables**: Add any required environment variables

## License

[MIT](LICENSE)