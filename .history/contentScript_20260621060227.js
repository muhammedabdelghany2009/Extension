let videoLoopTimer = null;
let executedLoopsCount = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const html5VideoElement = document.querySelector('video');
    if (!html5VideoElement) return;

    if (request.action === "START_LOOP") {
        clearInterval(videoLoopTimer);
        executedLoopsCount = 0;

        // تحويل الأوقات المكتوبة (مثل 1:30) لثوانٍ مجردة ليفهمها المتصفح
        const startTimeInSeconds = parseTimeToSeconds(request.from);
        const endTimeInSeconds = parseTimeToSeconds(request.to);
        const maximumAllowedLoops = request.count;

        html5VideoElement.currentTime = startTimeInSeconds;

        videoLoopTimer = setInterval(() => {
            if (html5VideoElement.currentTime >= endTimeInSeconds) {
                if (maximumAllowedLoops !== 'infinite' && executedLoopsCount >= parseInt(maximumAllowedLoops) - 1) {
                    clearInterval(videoLoopTimer);
                    console.log("Premium Loop Counter: Done.");
                } else {
                    html5VideoElement.currentTime = startTimeInSeconds;
                    executedLoopsCount++;
                }
            }
        }, 200);
    }

    if (request.action === "STOP_LOOP") {
        clearInterval(videoLoopTimer);
    }
});

function parseTimeToSeconds(timeString) {
    const segments = timeString.split(':').map(Number);
    if (segments.length === 2) return (segments[0] * 60) + segments[1];
    if (segments.length === 3) return (segments[0] * 3600) + (segments[1] * 60) + segments[2];
    return segments[0] || 0;
}
