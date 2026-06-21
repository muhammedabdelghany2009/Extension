// ============================================
// Content Script - حقن زر الدبوس في يوتيوب
// ============================================

let loopIntervalTimer = null;

// ============================================
// دالة حقن زر الدبوس 📌
// ============================================
function injectPremiumBookmarkButton() {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');

    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = '📌 حفظ علامة مرجعية';
        quickBtn.style.cssText = `
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 22px; 
            vertical-align: top; 
            transition: transform 0.15s ease; 
            border: none; 
            background: transparent; 
            cursor: pointer;
            padding: 0 4px;
            opacity: 0.9;
        `;
        quickBtn.innerHTML = '📌';

        quickBtn.addEventListener('mouseenter', () => {
            quickBtn.style.transform = 'scale(1.25)';
            quickBtn.style.opacity = '1';
        });
        quickBtn.addEventListener('mouseleave', () => {
            quickBtn.style.transform = 'scale(1)';
            quickBtn.style.opacity = '0.9';
        });

        quickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const videoElement = document.querySelector('video');
            if (!videoElement) {
                alert('❌ لم يتم العثور على مشغل الفيديو!');
                return;
            }

            videoElement.pause();

            // إرسال إشارة لفتح popup
            chrome.runtime.sendMessage({
                action: "TRIGGER_POPUP_ADD"
            });

            // تنبيه للمستخدم
            alert('✨ اضغط على أيقونة الإضافة في الأعلى لإضافة العلامة!');
        });

        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
        console.log('✅ زر الدبوس تم إضافته بنجاح!');
    }
}

// ============================================
// مراقبة التغييرات وإعادة الحقن
// ============================================
const observer = new MutationObserver(() => {
    injectPremiumBookmarkButton();
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// تنفيذ أولي
setTimeout(injectPremiumBookmarkButton, 1500);

// ============================================
// مستمع الرسائل من popup
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) {
        sendResponse({ error: 'No video found' });
        return true;
    }

    // 1. جلب الوقت الحالي
    if (request.action === "GET_CURRENT_TIME") {
        sendResponse({
            time: video.currentTime,
            formatted: formatTime(video.currentTime)
        });
        return true;
    }

    // 2. الانتقال إلى توقيت معين
    if (request.action === "SEEK_TO") {
        video.currentTime = request.seconds;
        video.play();
        sendResponse({ success: true });
        return true;
    }

    // 3. تشغيل التكرار
    if (request.action === "START_LOOP") {
        clearInterval(loopIntervalTimer);
        const startSecs = convertTimeToSeconds(request.from);
        const endSecs = convertTimeToSeconds(request.to);
        let counter = 0;

        video.currentTime = startSecs;
        video.play();

        loopIntervalTimer = setInterval(() => {
            if (video.currentTime >= endSecs) {
                if (request.count !== 'infinite' && counter >= parseInt(request.count) - 1) {
                    clearInterval(loopIntervalTimer);
                } else {
                    video.currentTime = startSecs;
                    counter++;
                }
            }
        }, 200);
        sendResponse({ success: true });
        return true;
    }

    // 4. إيقاف التكرار
    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
        sendResponse({ success: true });
        return true;
    }

    return true;
});

// ============================================
// دوال مساعدة
// ============================================
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function convertTimeToSeconds(str) {
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.length === 2) return (p[0] * 60) + p[1];
    if (p.length === 3) return (p[0] * 3600) + (p[1] * 60) + p[2];
    return p[0] || 0;
}

console.log('✅ Content Script - جاهز!');