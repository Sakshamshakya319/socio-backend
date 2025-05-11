// Socio.io Extension Setup Script
console.log("Socio.io setup script loaded");

// Configuration
const BACKEND_FILES = [
    { name: "app.py", path: "/backend/app.py" },
    { name: "content_filter.py", path: "/backend/content_filter.py" },
    { name: "requirements.txt", path: "/backend/requirements.txt" }
];

// Check if Python is installed
async function checkPythonInstalled() {
    try {
        // Create a download link for Python if not installed
        const pythonLink = document.createElement('a');
        pythonLink.href = 'https://www.python.org/downloads/';
        pythonLink.textContent = 'Download Python';
        pythonLink.target = '_blank';
        pythonLink.className = 'button';
        
        document.getElementById('pythonStatus').appendChild(pythonLink);
        return false;
    } catch (error) {
        console.error("Error checking Python:", error);
        document.getElementById('pythonStatus').textContent = 'Error checking Python installation';
        return false;
    }
}

// Extract backend files
async function extractBackendFiles() {
    try {
        document.getElementById('extractionStatus').textContent = 'Extracting backend files...';
        
        // Create a directory for the backend
        const backendDir = await createBackendDirectory();
        
        // Extract each file
        for (const file of BACKEND_FILES) {
            await extractFile(file.name, file.path, backendDir);
        }
        
        document.getElementById('extractionStatus').textContent = 'Backend files extracted successfully';
        return true;
    } catch (error) {
        console.error("Error extracting files:", error);
        document.getElementById('extractionStatus').textContent = 'Error extracting backend files: ' + error.message;
        return false;
    }
}

// Create backend directory
async function createBackendDirectory() {
    try {
        // In a browser extension, we can't directly create directories on the file system
        // Instead, we'll guide the user to create it manually or use the downloads directory
        
        // Get the downloads directory
        const downloadsDir = await getDownloadsDirectory();
        
        // Create a socio.io subdirectory in downloads
        const backendDir = downloadsDir + '/socio.io_backend';
        
        document.getElementById('backendLocation').textContent = backendDir;
        return backendDir;
    } catch (error) {
        console.error("Error creating backend directory:", error);
        throw error;
    }
}

// Get downloads directory
async function getDownloadsDirectory() {
    // This is a simplified version - in reality, we can't directly access the file system
    // We'll use the downloads API to download files to the default downloads directory
    return "Downloads";
}

// Extract a file from the extension to the backend directory
async function extractFile(fileName, filePath, backendDir) {
    try {
        // Get the file content from the extension
        const response = await fetch(chrome.runtime.getURL(filePath));
        const fileContent = await response.text();
        
        // Create a download link for the file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(new Blob([fileContent], { type: 'text/plain' }));
        downloadLink.download = fileName;
        downloadLink.textContent = 'Download ' + fileName;
        downloadLink.className = 'download-link';
        
        // Add the link to the page
        document.getElementById('downloadLinks').appendChild(downloadLink);
        document.getElementById('downloadLinks').appendChild(document.createElement('br'));
        
        return true;
    } catch (error) {
        console.error(`Error extracting file ${fileName}:`, error);
        throw error;
    }
}

// Install Python packages
async function installPythonPackages() {
    try {
        document.getElementById('packagesStatus').textContent = 'Installing Python packages...';
        
        // Create instructions for installing packages
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <p>To install the required Python packages, open a command prompt and run:</p>
            <code>pip install -r requirements.txt</code>
            <p>Make sure you're in the backend directory when running this command.</p>
        `;
        
        document.getElementById('packagesInstructions').appendChild(instructions);
        
        document.getElementById('packagesStatus').textContent = 'Please install Python packages manually';
        return true;
    } catch (error) {
        console.error("Error installing Python packages:", error);
        document.getElementById('packagesStatus').textContent = 'Error installing Python packages: ' + error.message;
        return false;
    }
}

// Start the backend server
async function startBackendServer() {
    try {
        document.getElementById('serverStatus').textContent = 'Starting backend server...';
        
        // Create instructions for starting the server
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <p>To start the backend server, open a command prompt and run:</p>
            <code>python app.py</code>
            <p>Make sure you're in the backend directory when running this command.</p>
        `;
        
        document.getElementById('serverInstructions').appendChild(instructions);
        
        document.getElementById('serverStatus').textContent = 'Please start the backend server manually';
        return true;
    } catch (error) {
        console.error("Error starting backend server:", error);
        document.getElementById('serverStatus').textContent = 'Error starting backend server: ' + error.message;
        return false;
    }
}

// Create a startup script
async function createStartupScript() {
    try {
        document.getElementById('startupStatus').textContent = 'Creating startup script...';
        
        // Create a startup script
        const scriptContent = `@echo off
echo Starting Socio.io backend server...
cd %~dp0
python app.py
pause`;
        
        // Create a download link for the script
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(new Blob([scriptContent], { type: 'text/plain' }));
        downloadLink.download = 'start_backend.bat';
        downloadLink.textContent = 'Download start_backend.bat';
        downloadLink.className = 'button';
        
        document.getElementById('startupScript').appendChild(downloadLink);
        
        document.getElementById('startupStatus').textContent = 'Startup script created';
        return true;
    } catch (error) {
        console.error("Error creating startup script:", error);
        document.getElementById('startupStatus').textContent = 'Error creating startup script: ' + error.message;
        return false;
    }
}

// Run the setup process
async function runSetup() {
    try {
        document.getElementById('setupStatus').textContent = 'Setting up Socio.io...';
        
        // Check if Python is installed
        const pythonInstalled = await checkPythonInstalled();
        
        // Extract backend files
        const filesExtracted = await extractBackendFiles();
        
        // Install Python packages
        const packagesInstalled = await installPythonPackages();
        
        // Create startup script
        const startupScriptCreated = await createStartupScript();
        
        // Start the backend server
        const serverStarted = await startBackendServer();
        
        // Update setup status
        if (filesExtracted && packagesInstalled && startupScriptCreated) {
            document.getElementById('setupStatus').textContent = 'Setup completed successfully';
            document.getElementById('setupStatus').className = 'status-success';
        } else {
            document.getElementById('setupStatus').textContent = 'Setup completed with some issues';
            document.getElementById('setupStatus').className = 'status-warning';
        }
        
        // Show the completion section
        document.getElementById('completion').style.display = 'block';
    } catch (error) {
        console.error("Error during setup:", error);
        document.getElementById('setupStatus').textContent = 'Error during setup: ' + error.message;
        document.getElementById('setupStatus').className = 'status-error';
    }
}

// Initialize the setup page
document.addEventListener('DOMContentLoaded', function() {
    // Set up button click handlers
    document.getElementById('startSetupBtn').addEventListener('click', function() {
        document.getElementById('setupIntro').style.display = 'none';
        document.getElementById('setupProcess').style.display = 'block';
        runSetup();
    });
    
    document.getElementById('checkBackendBtn').addEventListener('click', function() {
        // Check if the backend is running
        fetch('https://socio-backend-ipzg.onrender.com/ping')
            .then(response => response.json())
            .then(data => {
                alert('Backend is running! Status: ' + data.message);
            })
            .catch(error => {
                alert('Backend is not running. Please start the backend server.');
            });
    });
});