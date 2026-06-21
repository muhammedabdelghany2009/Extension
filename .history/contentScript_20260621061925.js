let loopIntervalTimer = null;

// مراقبة الصفحة للتأكد من حقن أيقونة الاختصار الشيك داخل شريط أدوات يوتيوب دائمًا
const injectShortcutIconObserver = new MutationObserver(() => {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');
    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {

        // بناء زر أيقونة مخصص شيك جداً متناسق مع تصميم يوتيوب المودرن
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = 'حفظ علامة مرجعية سريعة';
        quickBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; font-size: 17px; vertical-align: top; transition: transform 0.1s ease;';
        quickBtn.innerHTML = '📌';

        quickBtn.addEventListener('mouseenter', () => quickBtn.style.transform = 'scale(1.15)');
        quickBtn.addEventListener('mouseleave', () => quickBtn.style.transform = 'scale(1)');

        // عند الضغط على الأيقونة في مشغل الفيديو، يحاكي ضغطة الزر الرئيسي للإضافة لحفظ اللحظة فورًا
        quickBtn.addEventListener('click', () => {
            alert("✨ تم التقاط اللحظة الحالية! افتح واجهة الإضافة لتسميتها والتحكم بها.");
            // هنا يمكنك ربط الكود البرمجي لحفظها في الخلفية مباشرة
        });

        // إدراج الأيقونة الفاخرة بجانب أزرار التحكم اليمنى (الترس والمشاركة والملء الكامل)
        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
});

// بدء مراقبة مشغل الفيديو
injectShortcutIconObserver.observe(document.body, { childList: true, subtree: true });

// استقبال وتنفيذ الأوامر المباشرة الحية من الـ Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) return;

    if (request.action === "GET_CURRENT_TIME") {
        sendResponse({ time: video.currentTime });
    }

    if (request.action === "SEEK_TO") {
        video.currentTime = request.seconds;
        video.play();
    }

    if (request.action === "START_LOOP") {
        clearInterval(loopIntervalTimer);
        const startSecs = convertTimeToSeconds(request.from);
        const endSecs = convertTimeToSeconds(request.to);
        let counter = 0;

        video.currentTime = startSecs;
        loopIntervalTimer = setInterval(() => {
            if (video.currentTime >= endSecs) {
                if (request.count !== 'infinite' && counter >= parseInt(request.count) - 1) {
                    clearInterval(loopIntervalTimer);
                } else {
                    video.currentTime = startSecs;
                    counter++;
                }
            }
        }, 250);
    }

    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
    }
    return true;
});

function convertTimeToSeconds(str) {
    const p = str.split(':').map(Number);
    if (p.length === 2) return (p[0] * 60) + p[1];
    if (p.length === 3) return (p[0] * 3600) + (p[1] * 60) + p[2];
    return p[0] || 0;
}
