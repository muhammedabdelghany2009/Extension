let loopIntervalTimer = null;

// مراقبة شريط أدوات يوتيوب لحقن الأيقونة الشيك بجانب أزرار التحكم
const injectShortcutIconObserver = new MutationObserver(() => {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');
    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {

        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = 'حفظ علامة مرجعية سريعة وبوصف فوراً';
        quickBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; font-size: 17px; vertical-align: top; transition: transform 0.1s ease;';
        quickBtn.innerHTML = '📌';

        quickBtn.addEventListener('mouseenter', () => quickBtn.style.transform = 'scale(1.15)');
        quickBtn.addEventListener('mouseleave', () => quickBtn.style.transform = 'scale(1)');

        // دمج ميزة التوقيت والوصف الفوري حياً من شريط اليوتيوب مباشرة
        quickBtn.addEventListener('click', () => {
            const videoElement = document.querySelector('video');
            if (!videoElement) return;

            // إيقاف الفيديو مؤقتاً لتسهيل عملية الكتابة والتركيز
            videoElement.pause();

            const rawSeconds = videoElement.currentTime;
            const formattedTime = formatSecondsToTimeHelper(rawSeconds);
            const currentTitle = document.title;

            // إظهار الخانة الفورية لكتابة الوصف وعرض الوقت حياً للمستخدم
            const markerTitle = prompt(`⏱️ التوقيت الحالي الملتقط هو (${formattedTime})\n\nمن فضلك اكتب وصفاً لهذه العلامة المرجعية ليتم حفظها تلقائياً:`);

            if (markerTitle) {
                // توليد معرف الفيديو الفريد لحفظه في الـ Storage الحقيقي مباشرة
                const currentVideoId = btoa(unescape(encodeURIComponent(currentTitle))).substring(0, 15);

                chrome.storage.local.get([currentVideoId], (result) => {
                    let videoData = result[currentVideoId] || { title: currentTitle, markers: [] };

                    videoData.markers.push({
                        id: 'marker_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
                        title: markerTitle,
                        time: formattedTime,
                        seconds: rawSeconds
                    });

                    // التخزين الفوري والمؤكد في قاعدة بيانات كروم المحلية قبل الخروج
                    chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
                        console.log("Premium Saved: Bookmark saved successfully from player control.");
                        videoElement.play(); // استكمال تشغيل الفيديو تلقائياً بعد الحفظ
                    });
                });
            } else {
                videoElement.play(); // استكمال التشغيل إذا ألغى المستخدم العملية
            }
        });

        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
});

injectShortcutIconObserver.observe(document.body, { childList: true, subtree: true });

// مستمع الرسائل والأوامر
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

function formatSecondsToTimeHelper(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return (hrs > 0 ? `${hrs < 10 ? "0" : ""}${hrs}:` : "") + `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
