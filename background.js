let timerCheckInterval = null;

// Injects alert into active tab for timer completion
function showTimerAlert(mode, cycleOrTotal) {
    if (document.getElementById('youtube-timer-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'youtube-timer-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        backdrop-filter: blur(5px);
    `;

    const alertBox = document.createElement('div');
    let title, message, emoji, bgColor;

    if (mode === 'focus') {
        title = 'Focus Session Complete!';
        message = `Great job! You've completed cycle ${cycleOrTotal}. Time for a well-deserved break!`;
        emoji = '🎯';
        bgColor = '#8b5cf6';
    } else if (mode === 'complete') {
        title = 'All Cycles Complete!';
        message = `Congratulations! You've finished all ${cycleOrTotal} cycles. Excellent work staying focused!`;
        emoji = '🏆';
        bgColor = '#10b981';
    } else {
        // Fallback
        title = 'Session Complete!';
        message = 'Great work on your focus session!';
        emoji = '✅';
        bgColor = '#8b5cf6';
    }

    alertBox.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 400px;
        width: 90%;
        border: 2px solid ${bgColor};
    `;

    alertBox.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 10px;">
            ${emoji}
        </div>
        <h2 style="margin-bottom:15px; color: ${bgColor};">${title}</h2>
        <p style="margin-bottom: 20px; color: #666;">${message}</p>
        <button id="timer-close-btn" style="
            background: ${bgColor}; color: white;
            border: none; padding: 12px 24px;
            border-radius: 6px; cursor: pointer;
            font-weight: 500; font-size: 1rem;
            transition: all 0.3s ease;
        ">Continue</button>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Add hover effect
    const button = document.getElementById('timer-close-btn');
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
    });

    button.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Play notification sound
    try {
        new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBSmA0O/Mdiw').play();
    } catch (e) {}
}

// Website blocking functionality
let blockedWebsites = [];
let blockingEnabled = false;

function updateWebsiteBlocking(websites, enabled) {
    blockedWebsites = websites || [];
    blockingEnabled = enabled || false;
    
    if (!blockingEnabled || blockedWebsites.length === 0) {
        // Clear all blocking rules
        chrome.declarativeNetRequest?.updateDynamicRules({
            removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1)
        }).catch(err => {
            console.warn('Failed to clear blocking rules:', err);
        });
        return;
    }

    // Create blocking rules
    const rules = blockedWebsites.map((website, index) => ({
        id: index + 1,
        priority: 1,
        action: {
            type: "redirect",
            redirect: {
                url: `data:text/html,<html><head><title>Blocked</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5;}</style></head><body><h1>🚫 Website Blocked</h1><p>This website (${website}) has been blocked to help you stay focused.</p><p><small>Y-Traction Extension</small></p></body></html>`
            }
        },
        condition: {
            urlFilter: `*://*.${website}/*`,
            resourceTypes: ["main_frame"]
        }
    }));

    // Update blocking rules
    chrome.declarativeNetRequest?.updateDynamicRules({
        removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1),
        addRules: rules
    }).catch(err => {
        console.warn('Failed to update blocking rules:', err);
        console.log('Attempting alternative blocking method...');
        // Fallback: use webRequest blocking
        useWebRequestBlocking(websites, enabled);
    });
}

function useWebRequestBlocking(websites, enabled) {
    // Alternative blocking method using webRequest
    if (chrome.webRequest) {
        const urls = websites.map(site => `*://*.${site}/*`);
        
        if (enabled && urls.length > 0) {
            chrome.webRequest.onBeforeRequest.addListener(
                function(details) {
                    return {cancel: true};
                },
                {urls: urls},
                ["blocking"]
            );
        }
    }
}

// Enhanced timer check with more granular state management
function checkTimer() {
    chrome.storage.local.get(['timerState'], (result) => {
        if (!result.timerState) return;
        
        const timerState = result.timerState;
        if (timerState.isRunning && timerState.endTime && Date.now() >= timerState.endTime) {
            // Timer has completed, but let popup handle the transition
            // This is a backup check in case popup is closed
            
            const mode = timerState.mode || 'focus';
            const cycle = timerState.currentCycle || 1;
            
            // Create appropriate notification
            const notificationTitle = mode === 'focus' ? 'Focus Complete!' : 'Break Complete!';
            const notificationMessage = mode === 'focus' ? 
                `Cycle ${cycle} finished! Time for a break 🎯` : 
                'Break time over! Ready to focus? ☕';
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/notification48.png',
                title: notificationTitle,
                message: notificationMessage,
                priority: 2
            });

            // Show alert on YouTube pages
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]?.url?.includes('youtube.com')) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: showTimerAlert,
                        args: [mode, cycle]
                    }).catch(err => console.warn('Injection failed:', err));
                }
            });
        }
    });
}

// Apply settings to tab
function applySettingsToTab(tabId) {
    chrome.storage.local.get(null, (settings) => {
        try {
            chrome.tabs.sendMessage(tabId, {
                type: "applySettings",
                settings
            });
        } catch (err) {
            console.warn('Tab not ready:', err);
        }
    });
}

// Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "startTimer":
            if (timerCheckInterval) clearInterval(timerCheckInterval);
            timerCheckInterval = setInterval(checkTimer, 5000); // Check every 5 seconds
            sendResponse({ status: "Timer started" });
            break;

        case "clearTimer":
            if (timerCheckInterval) clearInterval(timerCheckInterval);
            chrome.storage.local.remove(['timerState', 'timerEndTime', 'timerRunning']);
            sendResponse({ status: "Timer cleared" });
            break;

        case "timerComplete":
            // Handle timer completion notification - only for focus sessions
            if (message.mode === 'focus') {
                const cycle = message.cycle || 1;
                
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/notification48.png',
                    title: '🎯 Focus Complete!',
                    message: `Great work! Cycle ${cycle} finished. Time for a break!`,
                    priority: 2
                });

                // Show alert on active YouTube tab
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (tabs[0]?.url?.includes('youtube.com')) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            function: showTimerAlert,
                            args: ['focus', cycle]
                        }).catch(err => console.warn('Injection failed:', err));
                    }
                });
            }
            sendResponse({ status: "Timer completion handled" });
            break;

        case "allCyclesComplete":
            // Handle all cycles completion
            const totalCycles = message.totalCycles || 4;
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/notification48.png',
                title: '🏆 All Cycles Complete!',
                message: `Congratulations! You've completed all ${totalCycles} cycles. Great job staying focused!`,
                priority: 2
            });

            // Show completion alert on active tab
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]?.url?.includes('youtube.com')) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: showTimerAlert,
                        args: ['complete', totalCycles]
                    }).catch(err => console.warn('Injection failed:', err));
                }
            });

            sendResponse({ status: "Cycles completion handled" });
            break;

        case "updateBlockingRules":
            // Handle website blocking rules
            updateWebsiteBlocking(message.websites, message.enabled);
            sendResponse({ status: "Blocking rules updated" });
            break;

        case "updateSwitch":
            chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, message);
                    } catch (err) {
                        console.warn('Tab not ready:', err);
                    }
                });
            });
            sendResponse({ status: "Settings broadcast initiated" });
            break;

        default:
            sendResponse({ error: "Unknown message type" });
    }
    return true;
});

// Tab events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
        setTimeout(() => applySettingsToTab(tabId), 1000);
    }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.url.includes('youtube.com')) {
        setTimeout(() => applySettingsToTab(details.tabId), 1000);
    }
}, { url: [{ hostContains: 'youtube.com' }] });

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url?.includes('youtube.com')) {
            applySettingsToTab(activeInfo.tabId);
        }
    });
});

chrome.runtime.onInstalled.addListener(() => {
    // Clean up old timer data on install
    chrome.storage.local.remove(['timerEndTime', 'timerRunning', 'timerState']);
    
    // Initialize website blocking
    chrome.storage.local.get(['blockedWebsites', 'blockingEnabled'], (result) => {
        if (result.blockedWebsites && result.blockingEnabled) {
            updateWebsiteBlocking(result.blockedWebsites, result.blockingEnabled);
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    // Check for existing timer state on startup
    chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState && result.timerState.isRunning && result.timerState.endTime) {
            if (Date.now() < result.timerState.endTime) {
                // Timer still running, start background check
                timerCheckInterval = setInterval(checkTimer, 5000);
            } else {
                // Timer expired while browser was closed
                chrome.storage.local.remove(['timerState']);
            }
        }
    });
    
    // Initialize website blocking on startup
    chrome.storage.local.get(['blockedWebsites', 'blockingEnabled'], (result) => {
        if (result.blockedWebsites && result.blockingEnabled) {
            updateWebsiteBlocking(result.blockedWebsites, result.blockingEnabled);
        }
    });
});
