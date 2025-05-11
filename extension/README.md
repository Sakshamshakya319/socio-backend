# Socio.io Content Moderation Extension

This extension provides content moderation for images and text on websites, filtering out inappropriate content.

## Installation Instructions

### Step 1: Install the Extension

1. Unzip the extension folder to a location on your computer
2. Open Chrome or Edge and go to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the `extension` directory

### Step 2: Install the Native Messaging Host (for Automatic Backend Startup)

#### Windows:
1. Right-click on `extension/native_host/install_host_win.bat` and select "Run as administrator"
2. Follow the prompts to complete the installation
3. If successful, you'll see "Native messaging host installed successfully"

#### macOS:
1. Open Terminal
2. Navigate to the extension/native_host directory
3. Run: `chmod +x install_host_mac.sh`
4. Run: `./install_host_mac.sh`

#### Linux:
1. Open Terminal
2. Navigate to the extension/native_host directory
3. Run: `chmod +x install_host_linux.sh`
4. Run: `./install_host_linux.sh`

### Step 3: Manual Backend Startup (if Automatic Startup Fails)

If the automatic backend startup doesn't work, you can start it manually:

1. Double-click on `start_backend.bat` (Windows) or run `python app.py` in Terminal (macOS/Linux)
2. Keep the command window open while using the extension
3. The extension will automatically connect to the running backend

## Troubleshooting

### Backend Not Starting Automatically

If the backend doesn't start automatically:

1. Check if Python is installed and in your PATH
2. Try running `start_backend.bat` manually
3. Look for error messages in the command window
4. Check the log files in `extension/native_host/`

### Extension Shows "ERROR" Status

If the extension popup shows "ERROR":

1. Make sure the backend is running (either automatically or manually)
2. Check if any ad blockers or privacy extensions are blocking the connection
3. Try disabling other extensions temporarily

### Native Host Installation Fails

If the native host installation fails:

1. Make sure you're running the installation script as administrator
2. Check the log file in `extension/native_host/install_log.txt`
3. Make sure Python is installed and in your PATH

## Requirements

- Python 3.6 or higher
- Chrome or Edge browser
- Required Python packages: flask, cryptography

To install required packages:
```
pip install flask cryptography
```

## Contact

If you encounter any issues, please contact support@socio.io