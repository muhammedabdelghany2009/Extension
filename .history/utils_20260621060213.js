// جلب بيانات التبويب الحالي النشط في المتصفح
async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    });
    return tabs[0];
}

// تحويل الثواني (مثل 135) إلى صيغة وقت نصية (02:15)
function formatSecondsToTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = "";
    if (hrs > 0) {
        result += (hrs < 10 ? "0" : "") + hrs + ":";
    }
    result += (mins < 10 ? "0" : "") + mins + ":";
    result += (secs < 10 ? "0" : "") + secs;
    
    return result;
}

// توليد معرف فريد (ID) لكل علامة لسهولة التحكم بها
function generateUniqueId() {
    return 'marker_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}
