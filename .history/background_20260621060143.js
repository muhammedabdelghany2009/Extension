// الاستماع لتحديثات التبويبات (مثل فتح فيديو جديد أو الانتقال لفيديو آخر)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // التعديل الذكي: نتحقق أولاً أن الصفحة أكملت التحميل (complete) وأن الرابط موجود ومتوفر
    if (changeInfo.status === "complete" && tab.url && tab.url.includes("youtube.com/watch")) {

        // استخراج متغيرات الرابط (Query Parameters)
        const queryParameters = tab.url.split("?")[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const videoId = urlParameters.get("v");

        // إرسال إشارة الـ NEW إلى الـ Content Script لإعلامه بالفيديو الجديد
        chrome.tabs.sendMessage(tabId, {
            type: "NEW",
            videoId: videoId
        }).catch(err => {
            // تجنب ظهور خطأ في الكونسول إذا لم يكن الـ Content Script قد تم تحميله بالكامل بعد
            console.log("جاري تهيئة الاتصال مع صفحة الفيديو...");
        });
    }
});

// مستمع لحدث تثبيت أو تحديث الإضافة لتهيئة مساحة التخزين (اختياري ومفيد)
chrome.runtime.onInstalled.addListener(() => {
    console.log("✨ My YT Bookmarks - تم التفعيل بنجاح!");
});
