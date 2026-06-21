let loopIntervalTimer = null;

// دالة حقن زر الدبوس 📌 بجانب الترس والترجمة والملء الكامل
function injectPremiumBookmarkButton() {
    // استهداف شريط التحكم الأيمن في يوتيوب (الذي يحتوي على الترس، الترجمة، والملء الكامل)
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');

    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {
        // بناء زر الدبوس الشيك متناسق بالكامل مع أزرار يوتيوب الرسمية
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = 'حفظ علامة مرجعية سريعة ووصف فوري';
        quickBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; font-size: 18px; vertical-align: top; transition: transform 0.1s ease; border: none; background: transparent; cursor: pointer;';
        quickBtn.innerHTML = '📌';

        // حركات تأثير حركي خفيف عند تحويم الفأرة فوق الزر
        quickBtn.addEventListener('mouseenter', () => quickBtn.style.transform = 'scale(1.2)');
        quickBtn.addEventListener('mouseleave', () => quickBtn.style.transform = 'scale(1)');

        // الميزة الأساسية: أول ما يضغط على الأيقونة اللي جنب الإعدادات تظهر قائمة منتصف الشاشة فوراً
        quickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const videoElement = document.querySelector('video');
            if (!videoElement) return;

            // إيقاف الفيديو مؤقتاً ليركز المستخدم أثناء كتابة الوصف
            videoElement.pause();

            const rawSeconds = videoElement.currentTime;
            const formattedTime = formatSecondsToTimeHelper(rawSeconds);
            const currentTitle = document.title;

            // فتح واجهة صندوق الوصف والتوقيت الفخمة في منتصف شاشة الفيديو
            showCustomBookmarkModal(rawSeconds, formattedTime, currentTitle, videoElement);
        });

        // إدراج زر الدبوس في أول قائمة التحكم اليمنى ليكون بجانب الترس والترجمة مباشرة
        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
}

// مراقبة الصفحة باستمرار لضمان بقاء الزر محقوناً حتى لو تنقل المستخدم بين الفيديوهات
const injectShortcutIconObserver = new MutationObserver(() => {
    injectPremiumBookmarkButton();
});
injectShortcutIconObserver.observe(document.body, { childList: true, subtree: true });

// تشغيل الحقن المبدئي فور تحميل الملف
injectPremiumBookmarkButton();

// دالة بناء وحقن النافذة المنبثقة المخصصة في منتصف الشاشة بأسلوب عصري فريد
function showCustomBookmarkModal(rawSeconds, formattedTime, currentTitle, videoElement) {
    if (document.getElementById('bookmark-custom-modal')) return;

    // 1. حقن التنسيقات الجمالية (CSS) الخاصة بالنافذة لتظهر في منتصف الشاشة تماماً وبخط كايرو
    if (!document.getElementById('bookmark-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'bookmark-modal-styles';
        style.textContent = `
      @import url('https://googleapis.com');
      
      .bookmark-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999 !important; animation: fadeInModal 0.2s ease-out;
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

    // 2. بناء عناصر الواجهة المنبثقة وحقنها
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

    // جعل المؤشر يقف تلقائياً داخل خانة الإدخال لتكتب فوراً بدون نقر إضافي
    const inputField = document.getElementById('bookmark-modal-desc');
    inputField.focus();

    // 3. برمجة زر الحفظ لحفظ البيانات مباشرة بداخل الـ Storage
    document.getElementById('bookmark-modal-btn-save').addEventListener('click', () => {
        const markerTitle = inputField.value.trim();
        if (!markerTitle) {
            inputField.style.borderColor = '#ef4444';
            return;
        }

        // توليد المعرف الفريد الثابت المبني على اسم الفيديو لربطه مع الـ Popup
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
                overlay.remove(); // إغلاق صندوق المدخلات
                videoElement.play(); // استئناف تشغيل الفيديو تلقائياً بعد الحفظ

                // إشعار اختياري في المتصفح لتأكيد الحفظ (صامت في واجهة التنبيهات المزعجة)
                console.log("My YT Bookmarks: Marker saved successfully to local storage.");
            });
        });
    });

    // 4. برمجة زر الإلغاء لإغلاق الصندوق واستكمال الفيديو مباشرة
    document.getElementById('bookmark-modal-btn-cancel').addEventListener('click', () => {
        overlay.remove();
        videoElement.play();
    });

    // دعم الاختصارات: Enter للحفظ و Escape للإلغاء الفوري من الكيبورد
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('bookmark-modal-btn-save').click();
        if (e.key === 'Escape') document.getElementById('bookmark-modal-btn-cancel').click();
    });
}

// مستمع الرسائل والأوامر القياسية القادمة من الـ Popup للتحكم والتنقل
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
