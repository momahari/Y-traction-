// Content script for YouTube DOM manipulation
// Safety check to ensure we're in the right context
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {

// CSS selectors for targeting YouTube interface elements
const YOUTUBE_SELECTORS = {
    youtubAdSwitch: [
        ".ytd-display-ad-renderer",
        ".ytd-in-feed-ad-layout-renderer",
        ".sparkles-light-cta",
        ".ytd-action-companion-ad-renderer",
        "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
        ".ytd-promoted-sparkles-web-renderer",
        ".ytd-promoted-video-renderer",
        "ytd-display-ad-renderer",
        ".ytd-banner-promo-renderer",
        ".ad-container"
    ],
    youtubProposition: [
        ".ytd-rich-grid-media",
        "#related",
        ".ytd-compact-video-renderer"
    ],
    youtubPlaylistes: [
        "#contents ytd-playlist-renderer",
        ".ytd-playlist-panel-renderer"
    ],
    youtubSideBar: [
        "ytd-mini-guide-renderer",
        "#guide-content",
        "tp-yt-app-drawer#guide",
        "#guide:not([role='complementary'])",
        "ytd-guide-renderer:not([role='complementary'])" 
    ],
    youtubMain: ["#primary"],
    youtubShorts: [
        "ytd-reel-shelf-renderer",
        "ytd-rich-shelf-renderer",
        "[is-shorts]",
        "ytd-shorts",
        "#shorts-container",
        "ytd-video-renderer:has([href*='/shorts/'])",
        "ytd-reel-video-renderer",
        "[is-short]",
        "ytd-shorts-shelf-renderer"
    ],
    youtubComments: [
        "ytd-comments",
        "#comments"
    ]
};

// Cache for storing the last known state of each setting
const settingsCache = new Map();

/**
 * Toggles visibility of YouTube elements based on selectors
 */
function toggleElements(selectors, shouldHide) {
    try {
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = shouldHide ? "none" : "";
            });
        });
    } catch (error) {
        console.error('Error in toggleElements:', error);
    }
}

/**
 * Applies all stored settings to the page
 */
async function applyAllSettings() {
    try {
        // Safety check for chrome storage API
        if (!chrome?.storage?.local) {
            console.warn('Chrome storage API not available');
            return;
        }
        
        const settings = await chrome.storage.local.get(null);
        Object.entries(settings).forEach(([key, value]) => {
            if (YOUTUBE_SELECTORS[key]) {
                toggleElements(YOUTUBE_SELECTORS[key], value);
                settingsCache.set(key, value);
            }
        });
    } catch (error) {
        console.error('Error applying settings:', error);
    }
}

/**
 * Updates a single setting
 */
function updateSetting(settingName, value) {
    if (YOUTUBE_SELECTORS[settingName]) {
        toggleElements(YOUTUBE_SELECTORS[settingName], value);
        settingsCache.set(settingName, value);
    }
}

// Message listener for popup & background
if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            switch (message.type) {
                case "updateSwitch":
                    if (message.switchName && message.value !== undefined) {
                        updateSetting(message.switchName, message.value);
                        sendResponse({ status: "success" });
                    }
                    break;

                case "applySettings":
                    applyAllSettings().then(() => {
                        sendResponse({ status: "settings_applied" });
                    }).catch((error) => {
                        console.error('Error applying settings via message:', error);
                        sendResponse({ error: error.message });
                    });
                    return true; // Keep message channel open for async response

                default:
                    sendResponse({ status: "unknown_message_type" });
            }
        } catch (error) {
            console.error('Error in message listener:', error);
            sendResponse({ error: error.message });
        }
        return true;
    });
} else {
    console.warn('Chrome runtime messaging not available');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const debouncedApplySettings = debounce(() => {
    applyAllSettings().catch(err => {
        console.error('Error in debouncedApplySettings:', err);
    });
}, 250);

// MutationObserver for DOM changes
const observer = new MutationObserver((mutations) => {
    if (settingsCache.size > 0) {
        let shouldUpdate = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0 || 
                (mutation.type === 'attributes' &&
                (mutation.attributeName === 'style' || mutation.attributeName === 'class'))) {
                shouldUpdate = true;
                break;
            }
        }
        if (shouldUpdate) {
            debouncedApplySettings();
        }
    }
});

// Only observe if document.body exists
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
} else {
    // Wait for body to be available
    const bodyObserver = new MutationObserver(() => {
        if (document.body) {
            bodyObserver.disconnect();
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
    });
    bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// Apply settings immediately on load
function initializeSettings() {
    applyAllSettings().catch(err => {
        console.error('Error applying initial settings:', err);
    });
}

// Wait for document to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSettings);
} else {
    initializeSettings();
}

// SPA navigation handling
let lastUrl = location.href;
const titleElement = document.querySelector('title');
if (titleElement) {
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => {
                applyAllSettings().catch(err => {
                    console.error('Error applying settings after navigation:', err);
                });
            }, 500);
        }
    }).observe(titleElement, {
        subtree: true,
        characterData: true,
        childList: true
    });
}

// Cleanup on unload
if (typeof window !== 'undefined') {
    window.addEventListener('unload', () => {
        observer.disconnect();
    });
}

} // End of safety check
