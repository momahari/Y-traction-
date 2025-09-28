// Tab Management
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize tabs
function initTabs() {
    // Load saved active tab or default to focus
    chrome.storage.local.get('activeTab', (result) => {
        const activeTab = result.activeTab || 'focus';
        switchTab(activeTab);
    });
}

function switchTab(tabName) {
    // Remove active class from all tabs and buttons
    tabContents.forEach(content => content.classList.remove('active'));
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected tab and button
    const selectedTab = document.getElementById(`${tabName}-tab`);
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (selectedTab && selectedBtn) {
        selectedTab.classList.add('active');
        selectedBtn.classList.add('active');
        
        // Save the active tab
        chrome.storage.local.set({ activeTab: tabName });
    }
}

// Add click event listeners to tab buttons
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        switchTab(tabName);
    });
});

// Initialize tabs when DOM is loaded
document.addEventListener('DOMContentLoaded', initTabs);

// Manage Dark Mode toggle and save to localStorage
let darkMode = localStorage.getItem("darkMode");
const switchMode = document.getElementById("modeBtn");

const enableDarkMode = () => {
    document.body.classList.add("darkMode");
    localStorage.setItem("darkMode", "active");
};

const disableDarkMode = () => {
    document.body.classList.remove("darkMode");
    localStorage.removeItem("darkMode");
};

// Apply dark mode if saved
if (darkMode === "active") enableDarkMode();

if (switchMode) {
    switchMode.addEventListener("click", () => {
        darkMode = localStorage.getItem("darkMode");
        darkMode !== "active" ? enableDarkMode() : disableDarkMode();
    });
}

// Manage YouTube functionality switches
const switches = {
    youtubMain: document.getElementById("flexSwitchCheckReverse"),
    youtubAdSwitch: document.getElementById("flexSwitchCheckDefault1"),
    youtubProposition: document.getElementById("flexSwitchCheckDefault2"),
    youtubPlaylistes: document.getElementById("flexSwitchCheckDefault3"),
    youtubSideBar: document.getElementById("flexSwitchCheckDefault5"),
    youtubComments: document.getElementById("flexSwitchCheckDefault4"),
    youtubShorts: document.getElementById("flexSwitchCheckDefault6"),
    HideAds: document.getElementById("flexSwitchCheckDefault7"),
};

// Initialize switches safely
Object.keys(switches).forEach((key) => {
    const switchElement = switches[key];
    if (!switchElement) return; // Prevent errors if element missing

    // Load initial state
    chrome.storage.local.get(key, (result) => {
        if (result[key] !== undefined) {
            switchElement.checked = result[key];
        } else {
            chrome.storage.local.set({ [key]: false });
        }
    });

    // Listen for changes
    switchElement.addEventListener("change", () => {
        const isActive = switchElement.checked;
        chrome.storage.local.set({ [key]: isActive }, () => {
            chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "updateSwitch",
                            switchName: key,
                            value: isActive,
                        });
                    } catch (err) {
                        console.warn("Could not send message:", err);
                    }
                });
            });
        });
    });
});

// Enhanced Pomodoro Timer Management
let timerInterval;
let currentTimerState = {
    isRunning: false,
    isPaused: false,
    mode: 'focus', // 'focus' or 'rest'
    currentCycle: 1,
    totalCycles: 4,
    focusMinutes: 25,
    restMinutes: 5,
    timeLeft: 0,
    totalTime: 0
};

// Initialize timer elements and event listeners
function initTimer() {
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    const resetBtn = document.getElementById('resetTimer');
    const focusInput = document.getElementById('focusMinutes');
    const restInput = document.getElementById('restMinutes');
    const cyclesInput = document.getElementById('totalCycles');

    // Load saved settings
    chrome.storage.local.get(['timerSettings'], (result) => {
        if (result.timerSettings) {
            const settings = result.timerSettings;
            currentTimerState.focusMinutes = settings.focusMinutes || 25;
            currentTimerState.restMinutes = settings.restMinutes || 5;
            currentTimerState.totalCycles = settings.totalCycles || 4;
            
            if (focusInput) focusInput.value = currentTimerState.focusMinutes;
            if (restInput) restInput.value = currentTimerState.restMinutes;
            if (cyclesInput) cyclesInput.value = currentTimerState.totalCycles;
        }
        updateCycleDots();
    });

    // Input change listeners
    if (focusInput) {
        focusInput.addEventListener('change', () => {
            currentTimerState.focusMinutes = parseInt(focusInput.value) || 25;
            saveTimerSettings();
            if (!currentTimerState.isRunning && currentTimerState.mode === 'focus') {
                resetTimer();
            }
        });
    }

    if (restInput) {
        restInput.addEventListener('change', () => {
            currentTimerState.restMinutes = parseInt(restInput.value) || 5;
            saveTimerSettings();
            if (!currentTimerState.isRunning && currentTimerState.mode === 'rest') {
                resetTimer();
            }
        });
    }

    if (cyclesInput) {
        cyclesInput.addEventListener('change', () => {
            currentTimerState.totalCycles = parseInt(cyclesInput.value) || 4;
            saveTimerSettings();
            updateCycleDots();
            if (currentTimerState.currentCycle > currentTimerState.totalCycles) {
                currentTimerState.currentCycle = 1;
                updateCycleDisplay();
            }
        });
    }

    // Button event listeners
    if (startBtn) {
        startBtn.addEventListener('click', startTimer);
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseTimer);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }

    // Check for existing timer when popup opens
    chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState) {
            const savedState = result.timerState;
            if (savedState.isRunning && savedState.endTime) {
                const remainingTime = Math.max(0, Math.floor((savedState.endTime - Date.now()) / 1000));
                if (remainingTime > 0) {
                    // Restore timer state
                    currentTimerState = { ...savedState, timeLeft: remainingTime };
                    updateTimerDisplay();
                    updateProgressBar();
                    updateCycleDisplay();
                    updateModeDisplay();
                    updateButtonStates();
                    
                    if (!savedState.isPaused) {
                        runTimer();
                    }
                } else {
                    // Timer expired while popup was closed
                    handleTimerComplete();
                }
            }
        }
    });
}

function startTimer() {
    if (currentTimerState.isPaused) {
        // Resume paused timer
        currentTimerState.isPaused = false;
        runTimer();
    } else {
        // Start new timer
        const minutes = currentTimerState.mode === 'focus' ? 
            currentTimerState.focusMinutes : currentTimerState.restMinutes;
        
        currentTimerState.timeLeft = minutes * 60;
        currentTimerState.totalTime = minutes * 60;
        currentTimerState.isRunning = true;
        
        runTimer();
    }
    
    updateButtonStates();
    saveTimerState();
}

function pauseTimer() {
    currentTimerState.isPaused = true;
    clearInterval(timerInterval);
    updateButtonStates();
    saveTimerState();
}

function resetTimer() {
    clearInterval(timerInterval);
    currentTimerState.isRunning = false;
    currentTimerState.isPaused = false;
    currentTimerState.mode = 'focus';
    currentTimerState.currentCycle = 1;
    currentTimerState.timeLeft = currentTimerState.focusMinutes * 60;
    currentTimerState.totalTime = currentTimerState.focusMinutes * 60;
    
    updateTimerDisplay();
    updateProgressBar();
    updateCycleDisplay();
    updateModeDisplay();
    updateButtonStates();
    updateCycleDots();
    
    chrome.storage.local.remove(['timerState']);
    chrome.runtime.sendMessage({ type: "clearTimer" });
}

function runTimer() {
    const endTime = Date.now() + (currentTimerState.timeLeft * 1000);
    currentTimerState.endTime = endTime;
    saveTimerState();
    
    chrome.runtime.sendMessage({
        type: "startTimer",
        endTime: endTime
    });

    timerInterval = setInterval(() => {
        if (currentTimerState.timeLeft <= 0) {
            handleTimerComplete();
            return;
        }
        
        currentTimerState.timeLeft--;
        updateTimerDisplay();
        updateProgressBar();
    }, 1000);
}

function handleTimerComplete() {
    clearInterval(timerInterval);
    
    if (currentTimerState.mode === 'focus') {
        // Focus session complete - notify only for focus completion
        chrome.runtime.sendMessage({
            type: "timerComplete",
            mode: currentTimerState.mode,
            cycle: currentTimerState.currentCycle
        });
        
        // Switch to rest mode
        currentTimerState.mode = 'rest';
        currentTimerState.timeLeft = currentTimerState.restMinutes * 60;
        currentTimerState.totalTime = currentTimerState.restMinutes * 60;
        
        updateCycleDisplay();
        updateModeDisplay();
        updateProgressBar();
        
        // Auto-start rest session (no notification for rest start)
        runTimer();
    } else {
        // Rest session complete
        currentTimerState.currentCycle++;
        
        if (currentTimerState.currentCycle > currentTimerState.totalCycles) {
            // All cycles complete - show final notification
            chrome.runtime.sendMessage({
                type: "allCyclesComplete",
                totalCycles: currentTimerState.totalCycles
            });
            resetTimer();
            return;
        } else {
            // Start next focus session (no notification for rest completion or focus start)
            currentTimerState.mode = 'focus';
            currentTimerState.timeLeft = currentTimerState.focusMinutes * 60;
            currentTimerState.totalTime = currentTimerState.focusMinutes * 60;
            
            updateCycleDisplay();
            updateModeDisplay();
            updateProgressBar();
            
            // Auto-start next focus session
            runTimer();
        }
    }
}

function updateTimerDisplay() {
    const timeLeftElement = document.getElementById('timeLeft');
    if (timeLeftElement) {
        const minutes = Math.floor(currentTimerState.timeLeft / 60);
        const seconds = currentTimerState.timeLeft % 60;
        timeLeftElement.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function updateProgressBar() {
    const circle = document.querySelector('.progress-ring-circle');
    const container = document.querySelector('.timer-container');
    
    if (circle && currentTimerState.totalTime > 0) {
        const radius = 52;
        const circumference = 2 * Math.PI * radius;
        const progress = (currentTimerState.totalTime - currentTimerState.timeLeft) / currentTimerState.totalTime;
        const offset = circumference - (progress * circumference);
        
        circle.style.strokeDashoffset = offset;
        
        // Update container class for rest mode styling
        if (container) {
            if (currentTimerState.mode === 'rest') {
                container.classList.add('rest-mode');
            } else {
                container.classList.remove('rest-mode');
            }
        }
    }
}

function updateModeDisplay() {
    const modeElement = document.getElementById('currentMode');
    if (modeElement) {
        modeElement.textContent = currentTimerState.mode === 'focus' ? 'Focus' : 'Rest';
    }
}

function updateCycleDisplay() {
    const currentCycleElement = document.getElementById('currentCycle');
    const totalCyclesElement = document.getElementById('totalCyclesDisplay');
    
    if (currentCycleElement) {
        currentCycleElement.textContent = currentTimerState.currentCycle;
    }
    if (totalCyclesElement) {
        totalCyclesElement.textContent = currentTimerState.totalCycles;
    }
    
    updateCycleDots();
}

function updateCycleDots() {
    // Remove existing dots
    const dotsContainer = document.querySelector('.cycle-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        
        // Create new dots based on total cycles
        for (let i = 1; i <= currentTimerState.totalCycles; i++) {
            const dot = document.createElement('span');
            dot.className = 'cycle-dot';
            dot.id = `dot-${i}`;
            
            if (i < currentTimerState.currentCycle) {
                dot.classList.add('completed');
            } else if (i === currentTimerState.currentCycle) {
                dot.classList.add('active');
            }
            
            dotsContainer.appendChild(dot);
        }
    }
}

function updateButtonStates() {
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    
    if (startBtn && pauseBtn) {
        if (currentTimerState.isRunning && !currentTimerState.isPaused) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'flex';
        } else {
            startBtn.style.display = 'flex';
            pauseBtn.style.display = 'none';
            
            if (currentTimerState.isPaused) {
                startBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            } else {
                startBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            }
        }
    }
}

function saveTimerSettings() {
    chrome.storage.local.set({
        timerSettings: {
            focusMinutes: currentTimerState.focusMinutes,
            restMinutes: currentTimerState.restMinutes,
            totalCycles: currentTimerState.totalCycles
        }
    });
}

function saveTimerState() {
    chrome.storage.local.set({
        timerState: currentTimerState
    });
}

// Website Blocker Management
const websitePresets = {
    social: [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 
        'snapchat.com', 'linkedin.com', 'reddit.com', 'pinterest.com', 'discord.com'
    ],
    entertainment: [
        'youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'spotify.com',
        'amazon.com/prime', 'disneyplus.com', 'hbomax.com', 'peacocktv.com'
    ],
    news: [
        'cnn.com', 'bbc.com', 'reuters.com', 'nytimes.com', 'washingtonpost.com',
        'theguardian.com', 'foxnews.com', 'nbcnews.com', 'abcnews.go.com'
    ],
    shopping: [
        'amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com',
        'bestbuy.com', 'alibaba.com', 'wish.com', 'shopify.com'
    ]
};

let blockedWebsites = [];
let blockingEnabled = false;

function initWebsiteBlocker() {
    const websiteInput = document.getElementById('websiteInput');
    const addBtn = document.getElementById('addWebsiteBtn');
    const blockedList = document.getElementById('blockedWebsitesList');
    const blockingToggle = document.getElementById('blockingEnabled');
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Load saved blocked websites and settings
    chrome.storage.local.get(['blockedWebsites', 'blockingEnabled'], (result) => {
        blockedWebsites = result.blockedWebsites || [];
        blockingEnabled = result.blockingEnabled || false;
        
        if (blockingToggle) {
            blockingToggle.checked = blockingEnabled;
        }
        
        updateBlockedList();
        updateBlockingStatus();
        updatePresetButtons(); // Add this line to update button states on load
    });

    // Add website button
    if (addBtn && websiteInput) {
        addBtn.addEventListener('click', () => addWebsite());
        websiteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addWebsite();
        });
    }

    // Blocking toggle
    if (blockingToggle) {
        blockingToggle.addEventListener('change', () => {
            blockingEnabled = blockingToggle.checked;
            saveBlockingSettings();
            updateBlockingStatus();
        });
    }

    // Preset buttons
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.getAttribute('data-preset');
            togglePreset(preset, button);
        });
    });

    // Update preset button states
    updatePresetButtons();
}

function addWebsite() {
    const input = document.getElementById('websiteInput');
    if (!input) return;

    let website = input.value.trim().toLowerCase();
    if (!website) return;

    // Clean up the input
    website = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

    // Validate domain format
    if (!isValidDomain(website)) {
        showMessage('Please enter a valid domain (e.g., facebook.com)', 'error');
        return;
    }

    if (!blockedWebsites.includes(website)) {
        blockedWebsites.push(website);
        saveBlockingSettings();
        updateBlockedList();
        updateBlockingStatus();
        updatePresetButtons();
        input.value = '';
        showMessage(`${website} added to blocked list`, 'success');
    } else {
        showMessage('Website is already blocked', 'warning');
    }
}

function removeWebsite(website) {
    const index = blockedWebsites.indexOf(website);
    if (index > -1) {
        blockedWebsites.splice(index, 1);
        saveBlockingSettings();
        updateBlockedList();
        updateBlockingStatus();
        updatePresetButtons();
        showMessage(`${website} removed from blocked list`, 'success');
    }
}

function togglePreset(presetName, button) {
    const presetWebsites = websitePresets[presetName] || [];
    const isActive = button.classList.contains('active');

    if (isActive) {
        // Remove preset websites
        presetWebsites.forEach(website => {
            const index = blockedWebsites.indexOf(website);
            if (index > -1) {
                blockedWebsites.splice(index, 1);
            }
        });
        button.classList.remove('active');
    } else {
        // Add preset websites
        presetWebsites.forEach(website => {
            if (!blockedWebsites.includes(website)) {
                blockedWebsites.push(website);
            }
        });
        button.classList.add('active');
    }

    saveBlockingSettings();
    updateBlockedList();
    updateBlockingStatus();
}

function updatePresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(button => {
        const preset = button.getAttribute('data-preset');
        const presetWebsites = websitePresets[preset] || [];
        const hasAllPresetSites = presetWebsites.every(site => blockedWebsites.includes(site));
        
        if (hasAllPresetSites && presetWebsites.length > 0) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function updateBlockedList() {
    const listContainer = document.getElementById('blockedWebsitesList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (blockedWebsites.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: var(--text-light); opacity: 0.7; font-size: 0.85rem; padding: 1rem;">No websites blocked</div>';
        return;
    }

    blockedWebsites.forEach(website => {
        const item = document.createElement('div');
        item.className = 'blocked-item';
        
        const websiteName = document.createElement('span');
        websiteName.className = 'website-name';
        websiteName.textContent = website;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => removeWebsite(website));
        
        item.appendChild(websiteName);
        item.appendChild(removeBtn);
        listContainer.appendChild(item);
    });
}

function updateBlockingStatus() {
    const countElement = document.getElementById('blockedCount');
    const statusElement = document.getElementById('blockingStatus');
    
    if (countElement) {
        countElement.textContent = blockedWebsites.length;
    }
    
    if (statusElement) {
        if (blockingEnabled && blockedWebsites.length > 0) {
            statusElement.style.color = 'var(--primary-color)';
        } else {
            statusElement.style.color = 'var(--text-light)';
        }
    }
}

function updateBlockingRules() {
    // Website blocking is now handled by content script injection
    // The blocker.js content script reads directly from storage
    // No need to send complex messages to background script
}

function saveBlockingSettings() {
    chrome.storage.local.set({
        blockedWebsites: blockedWebsites,
        blockingEnabled: blockingEnabled
    });
}

function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}

function showMessage(text, type = 'info') {
    // Create a simple toast message
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = text;
    
    // Style based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444', 
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
    `;
    
    // Add animation styles
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translate(-50%, 100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Initialize blocker when DOM loads
document.addEventListener('DOMContentLoaded', initWebsiteBlocker);

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', initTimer);
