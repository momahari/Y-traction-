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

    // Check password protection before adding
    if (passwordProtection) {
        passwordProtection.requirePassword('add').then(allowed => {
            if (!allowed) return;

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
        });
    } else {
        // Fallback if passwordProtection not ready
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
}

function removeWebsite(website) {
    // Check password protection before removing
    if (passwordProtection) {
        passwordProtection.requirePassword('remove').then(allowed => {
            if (!allowed) return;

            const index = blockedWebsites.indexOf(website);
            if (index > -1) {
                blockedWebsites.splice(index, 1);
                saveBlockingSettings();
                updateBlockedList();
                updateBlockingStatus();
                updatePresetButtons();
                showMessage(`${website} removed from blocked list`, 'success');
            }
        });
    } else {
        // Fallback if passwordProtection not ready
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
}

function togglePreset(presetName, button) {
    const presetWebsites = websitePresets[presetName] || [];
    const isActive = button.classList.contains('active');

    // Check password protection before modifying preset
    if (passwordProtection) {
        passwordProtection.requirePassword('preset').then(allowed => {
            if (!allowed) return;

            if (isActive) {
                // Remove preset websites
                presetWebsites.forEach(website => {
                    const index = blockedWebsites.indexOf(website);
                    if (index > -1) {
                        blockedWebsites.splice(index, 1);
                    }
                });
                button.classList.remove('active');
                showMessage(`${presetName} websites removed from blocked list`, 'info');
            } else {
                // Add preset websites
                presetWebsites.forEach(website => {
                    if (!blockedWebsites.includes(website)) {
                        blockedWebsites.push(website);
                    }
                });
                button.classList.add('active');
                showMessage(`${presetName} websites added to blocked list`, 'success');
            }

            saveBlockingSettings();
            updateBlockedList();
            updateBlockingStatus();
        });
    } else {
        // Fallback if passwordProtection not ready
        if (isActive) {
            // Remove preset websites
            presetWebsites.forEach(website => {
                const index = blockedWebsites.indexOf(website);
                if (index > -1) {
                    blockedWebsites.splice(index, 1);
                }
            });
            button.classList.remove('active');
            showMessage(`${presetName} websites removed from blocked list`, 'info');
        } else {
            // Add preset websites
            presetWebsites.forEach(website => {
                if (!blockedWebsites.includes(website)) {
                    blockedWebsites.push(website);
                }
            });
            button.classList.add('active');
            showMessage(`${presetName} websites added to blocked list`, 'success');
        }

        saveBlockingSettings();
        updateBlockedList();
        updateBlockingStatus();
    }
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

// Simplified Password Protection System
class PasswordProtection {
    constructor() {
        this.pendingAction = null;
        this.initElements();
        this.attachEventListeners();
        this.loadPasswordState();
    }

    initElements() {
        this.protectionBtn = document.getElementById('passwordProtectionBtn');
        this.setupModal = document.getElementById('passwordSetupModal');
        this.verifyModal = document.getElementById('passwordModal');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.confirmSetupBtn = document.getElementById('confirmSetupBtn');
        this.cancelSetupBtn = document.getElementById('cancelSetupBtn');
        this.setupError = document.getElementById('passwordSetupError');
        this.setupErrorText = document.getElementById('passwordSetupErrorText');
        this.passwordPrompt = document.getElementById('passwordPrompt');
        this.passwordError = document.getElementById('passwordError');
        this.confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
        this.cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
        
        // UI elements to protect
        this.blockedList = document.getElementById('blockedWebsitesList');
        this.addWebsiteSection = document.querySelector('.add-website');
        this.presetButtons = document.querySelector('.preset-buttons');
    }

    attachEventListeners() {
        if (this.protectionBtn) {
            this.protectionBtn.addEventListener('click', () => this.handleProtectionButton());
        }

        if (this.confirmSetupBtn) {
            this.confirmSetupBtn.addEventListener('click', () => this.handleSetPassword());
        }

        if (this.cancelSetupBtn) {
            this.cancelSetupBtn.addEventListener('click', () => this.hideSetupModal());
        }

        if (this.confirmPasswordBtn) {
            this.confirmPasswordBtn.addEventListener('click', () => this.handlePasswordConfirm());
        }

        if (this.cancelPasswordBtn) {
            this.cancelPasswordBtn.addEventListener('click', () => this.hidePasswordModal());
        }
        
        // Enter key support
        if (this.newPasswordInput) {
            this.newPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.confirmPasswordInput) {
                    this.confirmPasswordInput.focus();
                }
            });
        }

        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSetPassword();
            });
        }

        if (this.passwordPrompt) {
            this.passwordPrompt.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handlePasswordConfirm();
            });
        }
    }

    async loadPasswordState() {
        try {
            const result = await chrome.storage.local.get(['blockerPassword', 'passwordProtectionEnabled']);
            const hasPassword = !!result.blockerPassword;
            const isEnabled = result.passwordProtectionEnabled !== false;
            this.updateUI(hasPassword && isEnabled);
        } catch (error) {
            console.error('Error loading password state:', error);
        }
    }

    updateUI(isProtected) {
        console.log('updateUI called with isProtected:', isProtected);
        if (!this.protectionBtn) {
            console.log('protectionBtn element not found');
            return;
        }

        if (isProtected) {
            console.log('Setting UI to protected state');
            this.protectionBtn.innerHTML = '<i class="fas fa-unlock"></i> Remove Password Protection';
            this.protectionBtn.classList.add('protected');
            
            // Add protected styling to UI elements
            if (this.blockedList) this.blockedList.classList.add('protected');
            if (this.addWebsiteSection) this.addWebsiteSection.classList.add('protected');
            if (this.presetButtons) this.presetButtons.classList.add('protected');
        } else {
            console.log('Setting UI to unprotected state');
            this.protectionBtn.innerHTML = '<i class="fas fa-lock"></i> Add Password Protection';
            this.protectionBtn.classList.remove('protected');
            
            // Remove protected styling
            if (this.blockedList) this.blockedList.classList.remove('protected');
            if (this.addWebsiteSection) this.addWebsiteSection.classList.remove('protected');
            if (this.presetButtons) this.presetButtons.classList.remove('protected');
        }
    }

    async handleProtectionButton() {
        const isProtected = await this.isPasswordProtectionEnabled();
        
        if (isProtected) {
            // Remove protection - require password first
            this.promptPassword('remove', 'Enter password to remove protection:');
        } else {
            // Add protection - show setup modal
            this.showSetupModal();
        }
    }

    showSetupModal() {
        if (this.setupModal) {
            this.setupModal.style.display = 'flex';
            if (this.newPasswordInput) this.newPasswordInput.value = '';
            if (this.confirmPasswordInput) this.confirmPasswordInput.value = '';
            if (this.setupError) this.setupError.style.display = 'none';
            setTimeout(() => {
                if (this.newPasswordInput) this.newPasswordInput.focus();
            }, 100);
        }
    }

    hideSetupModal() {
        if (this.setupModal) {
            this.setupModal.style.display = 'none';
        }
    }

    async handleSetPassword() {
        const password = this.newPasswordInput ? this.newPasswordInput.value.trim() : '';
        const confirmPassword = this.confirmPasswordInput ? this.confirmPasswordInput.value.trim() : '';

        if (!password) {
            this.showSetupError('Please enter a password');
            return;
        }

        if (password.length < 4) {
            this.showSetupError('Password must be at least 4 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showSetupError('Passwords do not match');
            return;
        }

        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const hashedPassword = await this.hashPassword(password, salt);
            
            await chrome.storage.local.set({
                blockerPassword: Array.from(hashedPassword),
                passwordSalt: Array.from(salt),
                passwordProtectionEnabled: true
            });

            this.hideSetupModal();
            this.updateUI(true);
            showMessage('Password protection enabled', 'success');
        } catch (error) {
            console.error('Error setting password:', error);
            this.showSetupError('Failed to set password');
        }
    }

    showSetupError(message) {
        if (this.setupErrorText) this.setupErrorText.textContent = message;
        if (this.setupError) this.setupError.style.display = 'block';
    }

    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + Array.from(salt).join(''));
        return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    }

    verifyPassword(inputPassword, callback) {
        console.log('Verifying password...');
        chrome.storage.local.get(['blockerPassword', 'passwordSalt'], (result) => {
            console.log('Storage result:', result);
            
            if (!result.blockerPassword || !result.passwordSalt) {
                console.log('No password data found in storage');
                callback(false);
                return;
            }

            try {
                const storedHash = new Uint8Array(result.blockerPassword);
                const salt = new Uint8Array(result.passwordSalt);
                
                this.hashPassword(inputPassword, salt).then(inputHash => {
                    const isValid = this.arraysEqual(storedHash, inputHash);
                    console.log('Password verification result:', isValid);
                    callback(isValid);
                }).catch(error => {
                    console.error('Error hashing password for verification:', error);
                    callback(false);
                });
            } catch (error) {
                console.error('Error verifying password:', error);
                callback(false);
            }
        });
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    promptPassword(action, message) {
        this.pendingAction = action;
        const promptText = document.getElementById('passwordPromptText');
        if (promptText) promptText.textContent = message;
        if (this.passwordPrompt) this.passwordPrompt.value = '';
        if (this.passwordError) this.passwordError.style.display = 'none';
        this.showPasswordModal();
    }

    showPasswordModal() {
        if (this.verifyModal) {
            this.verifyModal.style.display = 'flex';
            setTimeout(() => {
                if (this.passwordPrompt) this.passwordPrompt.focus();
            }, 100);
        }
    }

    hidePasswordModal() {
        if (this.verifyModal) this.verifyModal.style.display = 'none';
        this.pendingAction = null;
    }

    handlePasswordConfirm() {
        const password = this.passwordPrompt ? this.passwordPrompt.value : '';
        console.log('handlePasswordConfirm called, action:', this.pendingAction);
        console.log('Password length:', password.length);
        
        this.verifyPassword(password, (isValid) => {
            console.log('Password validation result:', isValid);

            if (!isValid) {
                if (this.passwordError) this.passwordError.style.display = 'block';
                if (this.passwordPrompt) {
                    this.passwordPrompt.value = '';
                    this.passwordPrompt.focus();
                }
                return;
            }

            this.hidePasswordModal();

            if (this.pendingAction === 'remove') {
                console.log('Attempting to remove password protection...');
                chrome.storage.local.remove(['blockerPassword', 'passwordSalt', 'passwordProtectionEnabled'], () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error removing password:', chrome.runtime.lastError);
                        showMessage('Failed to remove password protection', 'error');
                    } else {
                        console.log('Password protection data removed from storage');
                        this.updateUI(false);
                        showMessage('Password protection removed', 'info');
                    }
                });
            }
        });
    }

    requirePassword(action, message = 'Enter password to modify blocked websites:', callback) {
        this.isPasswordProtectionEnabled((isEnabled) => {
            if (!isEnabled) {
                callback(true);
                return;
            }

            this.pendingAction = action;
            const promptText = document.getElementById('passwordPromptText');
            if (promptText) promptText.textContent = message;
            if (this.passwordPrompt) this.passwordPrompt.value = '';
            if (this.passwordError) this.passwordError.style.display = 'none';
            
            const originalHandleConfirm = this.handlePasswordConfirm.bind(this);
            this.handlePasswordConfirm = () => {
                const password = this.passwordPrompt ? this.passwordPrompt.value : '';
                this.verifyPassword(password, (isValid) => {
                    if (!isValid) {
                        if (this.passwordError) this.passwordError.style.display = 'block';
                        if (this.passwordPrompt) {
                            this.passwordPrompt.value = '';
                            this.passwordPrompt.focus();
                        }
                        return;
                    }

                    this.hidePasswordModal();
                    this.handlePasswordConfirm = originalHandleConfirm;
                    callback(true);
                });
            };

            const originalCancel = this.hidePasswordModal.bind(this);
            this.hidePasswordModal = () => {
                originalCancel();
                this.handlePasswordConfirm = originalHandleConfirm;
                this.hidePasswordModal = originalCancel;
                callback(false);
            };

            this.showPasswordModal();
        });
    }

    isPasswordProtectionEnabled(callback) {
        chrome.storage.local.get(['blockerPassword', 'passwordProtectionEnabled'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Error checking password protection status:', chrome.runtime.lastError);
                callback(false);
                return;
            }
            const isEnabled = !!result.blockerPassword && result.passwordProtectionEnabled !== false;
            callback(isEnabled);
        });
    }
}

// Initialize password protection
let passwordProtection;

// Initialize blocker when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initWebsiteBlocker();
    passwordProtection = new PasswordProtection();
});

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', initTimer);
