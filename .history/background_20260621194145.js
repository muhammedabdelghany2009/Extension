// ============================================
// Background Service Worker
// ============================================

// مستمع لتثبيت الإضافة
chrome.runtime.onInstalled.addListener(() => {
    console.log('📌 YouTube Bookmarks Pro - تم التثبيت بنجاح!');
});

// مستمع للرسائل من popup و content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // تمرير الرسائل إلى content script
    if (request.action === "GET_CURRENT_TIME" ||
        request.action === "SEEK_TO" ||
        request.action === "START_LOOP" ||
        request.action === "STOP_LOOP") {

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                    sendResponse(response);
                });
            }
        });
        return true; // للحفاظ على استمرارية الاتصال
    }
});

console.log('✅ Background Service Worker - جاهز!');