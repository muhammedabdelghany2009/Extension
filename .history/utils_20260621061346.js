// جلب التبويب النشط الحالي
async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    return tabs[0];
}

// تنسيق ثواني الفيديو إلى صيغة مقروءة
function formatSecondsToTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return (hrs > 0 ? `${hrs < 10 ? "0" : ""}${hrs}:` : "") + `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// توليد المعرفات الفريدة للعلامات
function generateUniqueId() {
    return 'marker_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}
