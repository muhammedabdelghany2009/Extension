let videoLoopInterval = null;
let currentLoopIter = 0;

// الاستماع لرسائل وأوامر الإضافة
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) return;

    if (request.action === "GET_CURRENT_TIME") {
        sendResponse({ time: video.currentTime });
    }
    if (request.action === "SEEK_TO") {
        video.currentTime = request.time;
    }
    if (request.action === "START_LOOP") {
        clearInterval(videoLoopInterval);
        currentLoopIter = 0;
        const startSecs = parseTimeToSeconds(request.from);
        const endSecs = parseTimeToSeconds(request.to);
        video.currentTime = startSecs;

        videoLoopInterval = setInterval(() => {
            if (video.currentTime >= endSecs) {
                if (request.count !== 'infinite' && currentLoopIter >= parseInt(request.count) - 1) {
                    clearInterval(videoLoopInterval);
                } else {
                    video.currentTime = startSecs;
                    currentLoopIter++;
                }
            }
        }, 200);
    }
    if (request.action === "STOP_LOOP") {
        clearInterval(videoLoopInterval);
    }
});

// ميزة شيك جداً: حقن الأيقونة التفاعلية داخل شريط أدوات يوتيوب الأصلي تلقائياً
function injectCustomBookmarkButton() {
    if (document.getElementById("yt-custom-bookmark-btn")) return;

    // جلب شريط التحكم الأيمن في مشغل يوتيوب (بجوار الترس والمشاركة والترجمة المذكورة بصورتك)
    const ytRightControls = document.querySelector(".ytp-right-controls");
    if (!ytRightControls) return;

    const btn = document.createElement("button");
    btn.id = "yt-custom-bookmark-btn";
    btn.className = "ytp-button";
    btn.title = "حفظ علامة مرجعية فورية عبر الإضافة";
    btn.style.cssText = "display: inline-flex; align-items: center; justify-content: center; font-size: 19px; vertical-align: top; cursor: pointer; transition: transform 0.1s;";
    btn.innerHTML = "📌"; // يمكنك استبدالها برابط الصورة من الـ assets عبر chrome.runtime.getURL('assets/bookmark.png')

    btn.addEventListener("click", () => {
        btn.style.transform = "scale(0.85)";
        setTimeout(() => btn.style.transform = "scale(1)", 100);

        const video = document.querySelector('video');
        if (!video) return;

        const markerName = prompt("📌 إضافة علامة سريعة من شريط الفيديو، اكتب عنواناً لها:");
        if (!markerName) return;

        const videoId = new URLSearchParams(window.location.search).get("v");
        const timeInSeconds = video.currentTime;
        const formattedTime = formatSecondsToTime(timeInSeconds);

        chrome.storage.local.get([videoId], (result) => {
            let videoData = result[videoId] || { title: document.title, markers: [] };
            videoData.markers.push({ id: generateUniqueId(), name: markerName, time: timeInSeconds, formatted: formattedTime });
            chrome.storage.local.set({ [videoId]: videoData });
        });
    });

    // إدراج الزر الشيك في أول شريط الأدوات الأيمن ليظهر بجانب لقطتك تماماً
    ytRightControls.insertBefore(btn, ytRightControls.firstChild);
}

// مراقبة الصفحة للتأكد من حقن الزر فور تحميل المشغل
setInterval(injectCustomBookmarkButton, 1000);
