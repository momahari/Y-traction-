// Website Blocker Content Script
// This script gets injected into blocked websites to show a block page

console.log('Y-Traction Website Blocker loaded');

// Check if this website should be blocked
async function checkAndBlockWebsite() {
    try {
        const currentDomain = window.location.hostname.replace('www.', '');
        console.log('Checking domain:', currentDomain);
        
        // Get blocked websites and blocking status from storage
        const result = await chrome.storage.local.get(['blockedWebsites', 'blockingEnabled']);
        const blockedWebsites = result.blockedWebsites || [];
        const blockingEnabled = result.blockingEnabled || false;
        
        console.log('Blocking enabled:', blockingEnabled);
        console.log('Blocked websites:', blockedWebsites);
        
        if (!blockingEnabled || blockedWebsites.length === 0) {
            return; // Blocking is disabled or no sites blocked
        }
        
        // Check if current domain is in the blocked list
        const isBlocked = blockedWebsites.some(blockedSite => {
            return currentDomain.includes(blockedSite) || blockedSite.includes(currentDomain);
        });
        
        if (isBlocked) {
            console.log('Website is blocked, showing block page');
            showBlockedPage(currentDomain);
        }
        
    } catch (error) {
        console.error('Error checking blocked websites:', error);
    }
}

function showBlockedPage(domain) {
    // Create the blocked page HTML
    const blockedPageHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🚫 Blocked by Y-Traction</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 20px;
                }
                
                .container {
                    max-width: 600px;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 60px 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .icon {
                    font-size: 5rem;
                    margin-bottom: 30px;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                    font-weight: 700;
                }
                
                .domain {
                    font-size: 1.3rem;
                    color: #ffd700;
                    font-weight: 600;
                    margin-bottom: 30px;
                    background: rgba(255, 215, 0, 0.2);
                    padding: 10px 20px;
                    border-radius: 25px;
                    display: inline-block;
                }
                
                .message {
                    font-size: 1.2rem;
                    line-height: 1.6;
                    margin-bottom: 40px;
                    opacity: 0.9;
                }
                
                .motivational {
                    font-size: 1.1rem;
                    font-style: italic;
                    margin-bottom: 40px;
                    opacity: 0.8;
                }
                
                .actions {
                    margin-top: 40px;
                }
                
                .btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 15px 30px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin: 0 10px;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(5px);
                }
                
                .btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: translateY(-2px);
                }
                
                .footer {
                    margin-top: 50px;
                    font-size: 0.9rem;
                    opacity: 0.7;
                }
                
                .stats {
                    margin-top: 30px;
                    font-size: 0.95rem;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">🚫</div>
                <h1>Website Blocked</h1>
                <div class="domain">${domain}</div>
                <div class="message">
                    This website has been blocked to help you stay focused and productive.
                </div>
                <div class="motivational">
                    "Success is the result of preparation, hard work, and learning from failure." - Colin Powell
                </div>
                <div class="actions">
                    <button class="btn" onclick="goBack()">← Go Back</button>
                    <button class="btn" onclick="openYTraction()">⚙️ Settings</button>
                </div>
                <div class="stats">
                    Time saved: Every moment counts!
                    <br>your time and your brain are the most valuable assets you have.
                </div>
                <div class="footer">
                    Blocked by <strong>Y-Traction Extension</strong><br>
                    Stay Hard, stay focused!
                    <br>Have a productive day! 🚀
                </div>
            </div>
            
            <script>
                function goBack() {
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'about:blank';
                    }
                }
                
                function openYTraction() {
                    // Try to send message to extension
                    if (typeof chrome !== 'undefined' && chrome.runtime) {
                        chrome.runtime.sendMessage({
                            type: 'openExtensionPopup'
                        });
                    }
                }
                
                // Add some interactivity
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        goBack();
                    }
                });
                
                // Show time blocked
                const startTime = Date.now();
                setInterval(() => {
                    const timeBlocked = Math.floor((Date.now() - startTime) / 1000);
                    const minutes = Math.floor(timeBlocked / 60);
                    const seconds = timeBlocked % 60;
                    document.querySelector('.stats').innerHTML = 
                        \`Time saved: \${minutes}m \${seconds}s 🎯\`;
                }, 1000);
            </script>
        </body>
        </html>
    `;
    
    // Replace the entire page content
    document.documentElement.innerHTML = blockedPageHTML;
    
    // Stop loading any additional resources
    window.stop && window.stop();
    
    // Clear the page title
    document.title = '🚫 Blocked by Y-Traction';
}

// Run the check when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndBlockWebsite);
} else {
    checkAndBlockWebsite();
}