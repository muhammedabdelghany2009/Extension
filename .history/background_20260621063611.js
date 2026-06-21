// الاستماع للرسائل القادمة من الـ Popup لجلب بيانات التبويب الحالي بأمان
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "FORCE_GET_ACTIVE_TAB") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                sendResponse({ tab: tabs[0] });
            } else {
                sendResponse({ tab: null });
            }
        });
        return true; // للحفاظ على القناة مفتوحة للرد غير المتزامن
    }
});

// مراقبة تحديثات الفيديوهات لتنبيه الـ Content Script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.url.includes("://youtube.com")) {
        const queryParameters = tab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const videoId = urlParameters.get("v");

        chrome.tabs.sendMessage(tabId, {
            type: "NEW",
            videoId: videoId
        }).catch(() => { });
    }
});
