function getActiveTabURL() {
    return new Promise((resolve) => {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            resolve(tabs[0]);
        });
    });
}

function formatSecondsToTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    let result = "";
    if (hrs > 0) result += (hrs < 10 ? "0" : "") + hrs + ":";
    result += (mins < 10 ? "0" : "") + mins + ":";
    result += (secs < 10 ? "0" : "") + secs;
    return result;
}

function parseTimeToSeconds(timeString) {
    const segments = timeString.split(':').map(Number);
    if (segments.length === 2) return (segments[0] * 60) + segments[1];
    if (segments.length === 3) return (segments[0] * 3600) + (segments[1] * 60) + segments[2];
    return segments[0] || 0;
}

function generateUniqueId() {
    return 'marker_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}
