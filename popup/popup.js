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

// Timer Management
let timerInterval;

const startTimerBtn = document.getElementById('startTimer');
if (startTimerBtn) {
    startTimerBtn.addEventListener('click', () => {
        const hours = Number(document.getElementById('hours')?.value) || 0;
        const minutes = Number(document.getElementById('minutes')?.value) || 0;
        const totalSeconds = (hours * 3600) + (minutes * 60);

        if (totalSeconds > 0) {
            const endTime = Date.now() + (totalSeconds * 1000);

            chrome.storage.local.set({
                timerEndTime: endTime,
                timerRunning: true
            }, () => {
                chrome.runtime.sendMessage({
                    type: "startTimer",
                    endTime
                }, (response) => {
                    if (response && response.status === "Timer started") {
                        startTimerDisplay(totalSeconds);
                    }
                });
            });
        }
    });
}

const resetTimerBtn = document.getElementById('resetTimer');
if (resetTimerBtn) {
    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        const hoursInput = document.getElementById('hours');
        const minutesInput = document.getElementById('minutes');
        const timeLeftDisplay = document.getElementById('timeLeft');

        if (hoursInput) hoursInput.value = '';
        if (minutesInput) minutesInput.value = '';
        if (timeLeftDisplay) timeLeftDisplay.textContent = '00:00:00';

        chrome.storage.local.remove(['timerEndTime', 'timerRunning'], () => {
            chrome.runtime.sendMessage({ type: "clearTimer" });
        });
    });
}

function startTimerDisplay(totalSeconds) {
    let timeLeft = totalSeconds;

    function updateDisplay() {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        const timeLeftDisplay = document.getElementById('timeLeft');
        if (timeLeftDisplay) {
            timeLeftDisplay.textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
        timeLeft--;
    }

    clearInterval(timerInterval);
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
}

// Check for existing timer when popup opens
window.addEventListener('load', () => {
    chrome.storage.local.get(['timerEndTime', 'timerRunning'], (result) => {
        if (result.timerRunning && result.timerEndTime) {
            const remainingTime = Math.max(0, Math.floor((result.timerEndTime - Date.now()) / 1000));
            if (remainingTime > 0) {
                startTimerDisplay(remainingTime);
            }
        }
    });
});
