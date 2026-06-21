let loopIntervalTimer = null;

// دالة حقن زر الدبوس 📌 بجانب الترس والترجمة والملء الكامل
function injectPremiumBookmarkButton() {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');

    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = 'حفظ علامة مرجعية (افتح واجهة الإضافة)';
        quickBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; font-size: 18px; vertical-align: top; transition: transform 0.1s ease; border: none; background: transparent; cursor: pointer;';
        quickBtn.innerHTML = '📌';

        quickBtn.addEventListener('mouseenter', () => quickBtn.style.transform = 'scale(1.2)');
        quickBtn.addEventListener('mouseleave', () => quickBtn.style.transform = 'scale(1)');

        // عند الضغط على الدبوس السفلي، يرسل إشارة حية للـ Popup لتفتح الكارت الأبيض فوراً
        quickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const videoElement = document.querySelector('video');
            if (videoElement) videoElement.pause(); // إيقاف مؤقت للتركيز والتقاط الوقت

            // إرسال رسالة داخلية لتفعيل فتح الكارت الأبيض بالوقت الحالي في الـ Popup
            chrome.runtime.sendMessage({ action: "TRIGGER_POPUP_ADD" });

            // تنبيه سريع لإرشادك بفتح الإضافة من الأعلى
            alert("✨ اضغط الآن على أيقونة الإضافة في الأعلى لتجد كارت الحفظ الأبيض جاهزاً بالوقت والوصف فوراً!");
        });

        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
}

// استمرار مراقبة المشغل أثناء التنقل بين الفيديوهات وداخل قوائم التشغيل
const injectShortcutIconObserver = new MutationObserver(() => { injectPremiumBookmarkButton(); });
injectShortcutIconObserver.observe(document.body, { childList: true, subtree: true });
injectPremiumBookmarkButton();

// مستمع الرسائل والأوامر القياسية القادمة من الـ Popup للتحكم والتنقل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) return;

    // 1. جلب الوقت الحالي للفيديو
    if (request.action === "GET_CURRENT_TIME") {
        sendResponse({ time: video.currentTime });
    }

    // 2. الانتقال إلى توقيت معين (عند الضغط على علامة مرجعية)
    if (request.action === "SEEK_TO") {
        video.currentTime = request.seconds;
        video.play();
    }

    // 3. تشغيل ميزة الـ Loop والتكرار الذكي المبرمج
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

    // 4. إيقاف ميزة التكرار المستمر
    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
    }

    return true;
});

// دالة تحويل الوقت النصي إلى ثوانٍ مجردة
function convertTimeToSeconds(str) {
    const p = str.split(':').map(Number);
    if (p.length === 2) return (p[0] * 60) + p[1];
    if (p.length === 3) return (p[0] * 3600) + (p[1] * 60) + p[2];
    return p[0] || 0;
}
