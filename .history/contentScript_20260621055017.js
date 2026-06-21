let loopInterval = null;
let currentLoopCount = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) return;

    if (message.action === "START_LOOP") {
        clearInterval(loopInterval);
        currentLoopCount = 0;

        const from = message.from;
        const to = message.to;
        const maxCount = message.count;

        // نقل الفيديو فوراً لنقطة البداية
        video.currentTime = from;

        // مراقبة وقت الفيديو الحالي كل 200 ملي ثانية لتطبيق التكرار
        loopInterval = setInterval(() => {
            if (video.currentTime >= to) {
                if (maxCount !== 'infinite' && currentLoopCount >= parseInt(maxCount) - 1) {
                    clearInterval(loopInterval); // إيقاف التكرار عند الوصول للحد المطلوب
                    console.log("اكتمل عدد مرات التكرار المطلوبة.");
                } else {
                    video.currentTime = from; // إعادة تشغيل المقطع من البداية
                    currentLoopCount++;
                }
            }
        }, 200);
    }

    if (message.action === "STOP_LOOP") {
        clearInterval(loopInterval);
    }
});
