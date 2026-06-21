chrome.tabs.onUpdated.addListener((tabId, tab) => {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com")) {
            chrome.tabs.sendMessage(tabId, {
                type: "NEW_VIDEO",
                url: tab.url
            }).catch(err => console.log("Content script not ready yet."));
        }
    });
});