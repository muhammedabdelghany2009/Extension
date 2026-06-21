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

        // عند الضغط على الدبوس، تظهر النافذة المنبثقة المخصصة الفخمة في منتصف الشاشة
        quickBtn.addEventListener('click', () => {
            const videoElement = document.querySelector('video');
            if (!videoElement) return;

            // إيقاف الفيديو مؤقتاً لتسهيل عملية الكتابة والتركيز
            videoElement.pause();

            const rawSeconds = videoElement.currentTime;
            const formattedTime = formatSecondsToTimeHelper(rawSeconds);
            const currentTitle = document.title;

            // فتح النافذة المنبثقة الاحترافية في منتصف الشاشة
            showCustomBookmarkModal(rawSeconds, formattedTime, currentTitle, videoElement);
        });

        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
});

injectShortcutIconObserver.observe(document.body, { childList: true, subtree: true });

// دالة بناء وحقن النافذة المنبثقة المخصصة في منتصف الشاشة بأسلوب عصري فريد
function showCustomBookmarkModal(rawSeconds, formattedTime, currentTitle, videoElement) {
    // منع تكرار فتح النافذة إذا كانت مفتوحة بالفعل
    if (document.getElementById('bookmark-custom-modal')) return;

    // 1. حقن التنسيقات الجمالية (CSS) الخاصة بالنافذة
    if (!document.getElementById('bookmark-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'bookmark-modal-styles';
        style.textContent = `
      @import url('https://googleapis.com');
      
      .bookmark-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; animation: fadeInModal 0.25s ease-out;
        direction: rtl; font-family: 'Cairo', sans-serif;
      }
      .bookmark-modal-card {
        background: #ffffff; width: 360px; padding: 20px; border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04);
        text-align: center; border: 1px solid #e2e8f0;
      }
      .bookmark-modal-header { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
      .bookmark-time-badge {
        display: inline-block; background: #eff6ff; color: #3b82f6;
        padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 16px;
      }
      .bookmark-input-group { text-align: right; margin-bottom: 18px; }
      .bookmark-input-group label { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; }
      .bookmark-modal-input {
        width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px;
        font-family: 'Cairo', sans-serif; font-size: 13px; box-sizing: border-box; outline: none; transition: all 0.2s;
      }
      .bookmark-modal-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      .bookmark-modal-actions { display: flex; gap: 10px; }
      .bookmark-btn {
        flex: 1; padding: 10px; border: none; border-radius: 10px; font-family: 'Cairo', sans-serif;
        font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s ease-in-out;
      }
      .bookmark-btn-save { background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; box-shadow: 0 4px 10px rgba(59,130,246,0.2); }
      .bookmark-btn-save:hover { opacity: 0.95; transform: translateY(-0.5px); }
      .bookmark-btn-cancel { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
      .bookmark-btn-cancel:hover { background: #e2e8f0; }
      
      @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
    `;
        document.head.appendChild(style);
    }

    // 2. بناء عناصر الهيكل (HTML) للنافذة المنبثقة
    const overlay = document.createElement('div');
    overlay.id = 'bookmark-custom-modal';
    overlay.className = 'bookmark-overlay';

    overlay.innerHTML = `
    <div class="bookmark-modal-card">
      <div class="bookmark-modal-header">🎯 التقاط لقطة مرجعية حية</div>
      <div class="bookmark-time-badge">⏱️ التوقيت الحالي: ${formattedTime}</div>
      
      <div class="bookmark-input-group">
        <label>وصف العلامة المرجعية</label>
        <input type="text" id="bookmark-modal-desc" class="bookmark-modal-input" placeholder="اكتب وصفاً أو اسماً لهذه اللحظة..." autocomplete="off">
      </div>
      
      <div class="bookmark-modal-actions">
        <button id="bookmark-modal-btn-save" class="bookmark-btn bookmark-btn-save">حفظ اللحظة 💾</button>
        <button id="bookmark-modal-btn-cancel" class="bookmark-btn bookmark-btn-cancel">إلغاء</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // إعطاء التركيز (Focus) الفوري لخانة الإدخال لتكتب فوراً بدون نقر إضافي
    const inputField = document.getElementById('bookmark-modal-desc');
    inputField.focus();

    // 3. برمجة زر الحفظ الفوري بداخل قاعدة بيانات التخزين
    document.getElementById('bookmark-modal-btn-save').addEventListener('click', () => {
        const markerTitle = inputField.value.trim();
        if (!markerTitle) {
            inputField.style.borderColor = '#ef4444';
            return;
        }

        const currentVideoId = btoa(unescape(encodeURIComponent(currentTitle))).substring(0, 15);

        chrome.storage.local.get([currentVideoId], (result) => {
            let videoData = result[currentVideoId] || { title: currentTitle, markers: [] };

            videoData.markers.push({
                id: 'marker_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
                title: markerTitle,
                time: formattedTime,
                seconds: rawSeconds
            });

            chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
                overlay.remove(); // إغلاق النافذة بنجاح
                videoElement.play(); // استئناف مشغل يوتيوب تلقائياً
            });
        });
    });

    // 4. برمجة زر الإلغاء لاستئناف الفيديو مباشرة
    document.getElementById('bookmark-modal-btn-cancel').addEventListener('click', () => {
        overlay.remove();
        videoElement.play();
    });

    // دعم زر الـ Enter للحفظ وزر الـ Escape للإلغاء من لوحة المفاتيح لمزيد من الاحترافية
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('bookmark-modal-btn-save').click();
        if (e.key === 'Escape') document.getElementById('bookmark-modal-btn-cancel').click();
    });
}

// مستمع الرسائل والأوامر القياسية القادمة من الـ Popup
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
    if (p.length === 2) return (p * 60) + p;
    if (p.length === 3) return (p * 3600) + (p * 60) + p;
    return p || 0;
}

function formatSecondsToTimeHelper(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return (hrs > 0 ? `${hrs < 10 ? "0" : ""}${hrs}:` : "") + `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
