// Socio.io Extension Setup Script
console.log("Socio.io setup script loaded");

// Configuration
const BACKEND_URL = 'https://socio-backend-zxxd.onrender.com';

// Check backend connection
async function checkBackendConnection() {
    try {
        document.getElementById('connectionStatus').textContent = 'Checking connection to backend...';
        
        // Try to connect to the backend
        const response = await fetch(`${BACKEND_URL}/ping`);
        const data = await response.json();
        
        if (data && data.status === 'ok') {
            document.getElementById('connectionStatus').textContent = 'Connected to backend successfully!';
            document.getElementById('connectionStatus').className = 'status-success';
            return true;
        } else {
            document.getElementById('connectionStatus').textContent = 'Backend responded but with unexpected data';
            document.getElementById('connectionStatus').className = 'status-warning';
            return false;
        }
    } catch (error) {
        console.error("Error connecting to backend:", error);
        document.getElementById('connectionStatus').textContent = 'Error connecting to backend: ' + error.message;
        document.getElementById('connectionStatus').className = 'status-error';
        return false;
    }
}

// Display backend information
function displayBackendInfo() {
    try {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'backend-info';
        infoDiv.innerHTML = `
            <h3>Backend Information</h3>
            <p>Your extension is connected to the Socio.io backend running on Render.</p>
            <p><strong>Backend URL:</strong> ${BACKEND_URL}</p>
            <p>This backend provides content moderation services including:</p>
            <ul>
                <li>Text content filtering</li>
                <li>Image content filtering</li>
                <li>Content decryption for recovery</li>
            </ul>
            <p>The backend is hosted on Render and is always available - no local setup required!</p>
        `;
        
        document.getElementById('backendInfo').appendChild(infoDiv);
        return true;
    } catch (error) {
        console.error("Error displaying backend info:", error);
        return false;
    }
}

// Run the setup process
async function runSetup() {
    try {
        document.getElementById('setupStatus').textContent = 'Checking Socio.io backend...';
        
        // Check backend connection
        const backendConnected = await checkBackendConnection();
        
        // Display backend information
        const infoDisplayed = displayBackendInfo();
        
        // Update setup status
        if (backendConnected) {
            document.getElementById('setupStatus').textContent = 'Setup completed successfully';
            document.getElementById('setupStatus').className = 'status-success';
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <h3>🎉 All Set!</h3>
                <p>Your Socio.io extension is connected to the cloud backend and ready to use.</p>
                <p>You can now browse the web with content moderation protection enabled.</p>
            `;
            document.getElementById('setupComplete').appendChild(successMessage);
        } else {
            document.getElementById('setupStatus').textContent = 'Setup completed with connection issues';
            document.getElementById('setupStatus').className = 'status-warning';
            
            // Show troubleshooting tips
            const troubleshootingTips = document.createElement('div');
            troubleshootingTips.className = 'troubleshooting-tips';
            troubleshootingTips.innerHTML = `
                <h3>Troubleshooting Tips</h3>
                <p>If you're having trouble connecting to the backend:</p>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Make sure the backend service is running on Render</li>
                    <li>Try refreshing the page and checking again</li>
                </ul>
            `;
            document.getElementById('setupComplete').appendChild(troubleshootingTips);
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
        fetch('https://socio-backend-zxxd.onrender.com/ping')
            .then(response => response.json())
            .then(data => {
                alert('Backend is running! Status: ' + data.message);
            })
            .catch(error => {
                alert('Backend is not running or cannot be reached. Please check the Render service status.');
            });
    });
});