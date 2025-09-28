// Minimal test content script to check for errors
console.log('Y-Traction: Test content script loaded');

// Test chrome API availability
if (typeof chrome === 'undefined') {
    console.error('Y-Traction: Chrome API not available');
} else if (!chrome.runtime) {
    console.error('Y-Traction: Chrome runtime not available');
} else if (!chrome.runtime.id) {
    console.error('Y-Traction: Chrome runtime ID not available');
} else if (!chrome.storage) {
    console.error('Y-Traction: Chrome storage not available');
} else {
    console.log('Y-Traction: All Chrome APIs available');
}

// Test basic DOM manipulation
try {
    const testDiv = document.createElement('div');
    testDiv.style.display = 'none';
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    console.log('Y-Traction: DOM manipulation test passed');
} catch (error) {
    console.error('Y-Traction: DOM manipulation test failed:', error);
}

// Test async function
async function testAsync() {
    try {
        const result = await new Promise(resolve => {
            setTimeout(() => resolve('test'), 100);
        });
        console.log('Y-Traction: Async test passed:', result);
    } catch (error) {
        console.error('Y-Traction: Async test failed:', error);
    }
}

testAsync();