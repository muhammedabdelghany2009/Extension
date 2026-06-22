let isLoopRunning = false;

chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Bookmarks Pro installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_CURRENT_TIME" ||
        request.action === "SEEK_TO" ||
        request.action === "START_LOOP" ||
        request.action === "STOP_LOOP" ||
        request.action === "OPEN_WHITE_CARD") {

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                    sendResponse(response);
                });
            }
        });
        return true;
    }

    if (request.action === "LOOP_RUNNING") {
        isLoopRunning = true;
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "LOOP_STOPPED" || request.action === "LOOP_FINISHED") {
        isLoopRunning = false;
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "CHECK_LOOP_STATUS") {
        sendResponse({ isRunning: isLoopRunning });
        return true;
    }
});

