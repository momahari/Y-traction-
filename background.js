let timerCheckInterval = null;

// Injects alert into active tab
function showTimerAlert() {
    if (document.getElementById('youtube-timer-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'youtube-timer-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
    `;

    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 400px;
        width: 90%;
    `;
    alertBox.innerHTML = `
        <h2 style="margin-bottom:15px;">Time's Up!</h2>
        <p>Your browsing timer has ended.</p>
        <button id="timer-close-btn" style="
            background: #8b5cf6; color: white;
            border: none; padding: 10px 20px;
            border-radius: 4px; cursor: pointer;
        ">Close</button>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    document.getElementById('timer-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    new Audio('data:audio/wav;base64,...').play().catch(() => {});
}

// Timer check
function checkTimer() {
    chrome.storage.local.get(['timerEndTime', 'timerRunning'], (result) => {
        if (result.timerRunning && result.timerEndTime && Date.now() >= result.timerEndTime) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Time\'s Up!',
                message: 'Your browsing timer has ended!',
                priority: 2
            });

            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]?.url?.includes('youtube.com')) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: showTimerAlert
                    }).catch(err => console.warn('Injection failed:', err));
                }
            });

            clearInterval(timerCheckInterval);
            chrome.storage.local.remove(['timerEndTime', 'timerRunning']);
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
            timerCheckInterval = setInterval(checkTimer, 1000);
            chrome.storage.local.set({
                timerEndTime: message.endTime,
                timerRunning: true
            });
            sendResponse({ status: "Timer started" });
            break;

        case "clearTimer":
            if (timerCheckInterval) clearInterval(timerCheckInterval);
            chrome.storage.local.remove(['timerEndTime', 'timerRunning']);
            sendResponse({ status: "Timer cleared" });
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
    chrome.storage.local.remove(['timerEndTime', 'timerRunning']);
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['timerEndTime', 'timerRunning'], (result) => {
        if (result.timerRunning && result.timerEndTime && Date.now() < result.timerEndTime) {
            timerCheckInterval = setInterval(checkTimer, 1000);
        } else {
            chrome.storage.local.remove(['timerEndTime', 'timerRunning']);
        }
    });
});
