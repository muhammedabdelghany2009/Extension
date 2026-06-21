let loopIntervalTimer = null;

// ========================================================
// دالة حقن زر الدبوس 📌 بجانب الترس والترجمة والملء الكامل
// ========================================================
function injectPremiumBookmarkButton() {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');

    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = 'حفظ علامة مرجعية 📌';
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

        // تأثيرات hover
        quickBtn.addEventListener('mouseenter', () => {
            quickBtn.style.transform = 'scale(1.25)';
            quickBtn.style.opacity = '1';
        });
        quickBtn.addEventListener('mouseleave', () => {
            quickBtn.style.transform = 'scale(1)';
            quickBtn.style.opacity = '0.9';
        });

        // ✅ عند الضغط على الدبوس السفلي: فتح الكارت الأبيض مباشرةً
        quickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const videoElement = document.querySelector('video');
            if (!videoElement) {
                alert('❌ لم يتم العثور على مشغل الفيديو!');
                return;
            }

            // إيقاف مؤقت للتركيز والتقاط الوقت
            videoElement.pause();

            // الحصول على الوقت الحالي بالفيديو
            const currentTime = videoElement.currentTime;
            const formattedTime = formatTime(currentTime);

            // عرض الكارت الأبيض فوراً
            showWhiteCard(currentTime, formattedTime);

            // إرسال رسالة للـ Popup (اختياري للتواصل مع الخلفية)
            chrome.runtime.sendMessage({
                action: "TRIGGER_POPUP_ADD",
                time: currentTime,
                formatted: formattedTime
            });
        });

        // إضافة الزر في البداية (قبل الأزرار الأخرى)
        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
        console.log('✅ زر الدبوس تم إضافته بنجاح!');
    }
}

// ========================================================
// دالة تحويل الوقت إلى صيغة نصية (مثلاً: 01:23)
// ========================================================
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ========================================================
// دالة إنشاء وعرض الكارت الأبيض في منتصف الشاشة
// ========================================================
function showWhiteCard(currentTime, formattedTime) {
    // إزالة أي كارت موجود مسبقاً
    const existingCard = document.getElementById('yt-custom-white-card');
    if (existingCard) existingCard.remove();

    // إنشاء العنصر الحاوي للكارت
    const card = document.createElement('div');
    card.id = 'yt-custom-white-card';

    // تصميم الكارت مع ستايل جميل ومحسّن
    card.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        padding: 30px 35px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.4);
        z-index: 99999;
        min-width: 380px;
        max-width: 450px;
        font-family: 'Segoe UI', 'YouTube Sans', Roboto, sans-serif;
        direction: rtl;
        text-align: right;
        animation: slideUp 0.25s ease;
    `;

    // إضافة ستايل للـ animation
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -40%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        #yt-custom-white-card .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 500;
            color: #1a1a1a;
        }
        #yt-custom-white-card .time-badge {
            background: #f0f0f0;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 18px;
            font-weight: 600;
            color: #065fd4;
            font-family: 'Courier New', monospace;
        }
        #yt-custom-white-card .card-sub {
            color: #606060;
            font-size: 14px;
            margin: 8px 0 16px 0;
        }
        #yt-custom-white-card input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border 0.2s ease;
            box-sizing: border-box;
            margin-bottom: 20px;
            font-family: inherit;
        }
        #yt-custom-white-card input:focus {
            border-color: #065fd4;
            box-shadow: 0 0 0 3px rgba(6, 95, 212, 0.15);
        }
        #yt-custom-white-card .card-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        #yt-custom-white-card .card-actions button {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        #yt-custom-white-card #btn-cancel {
            background: #f0f0f0;
            color: #333;
        }
        #yt-custom-white-card #btn-cancel:hover {
            background: #e0e0e0;
        }
        #yt-custom-white-card #btn-save {
            background: #065fd4;
            color: white;
        }
        #yt-custom-white-card #btn-save:hover {
            background: #054baf;
            transform: scale(1.02);
        }
        #yt-custom-white-card .overlay-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.4);
            z-index: 99998;
        }
    `;
    document.head.appendChild(styleTag);

    // إضافة خلفية شفافة (backdrop)
    const backdrop = document.createElement('div');
    backdrop.className = 'overlay-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.4);
        z-index: 99998;
        animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(backdrop);

    // محتوى الكارت
    card.innerHTML = `
        <div class="card-header">
            <span>📌 حفظ علامة عند توقيت:</span>
            <span class="time-badge">${formattedTime}</span>
        </div>
        <p class="card-sub">وصف اللحظة الحالية</p>
        <input type="text" id="bookmark-desc" placeholder="اكتب وصفاً سريعاً للعلامة..." autofocus />
        <div class="card-actions">
            <button id="btn-cancel">إلغاء</button>
            <button id="btn-save">💾 حفظ الآن</button>
        </div>
    `;

    document.body.appendChild(card);

    // إضافة أحداث الأزرار
    const closeCard = () => {
        card.remove();
        backdrop.remove();
    };

    document.getElementById('btn-cancel').addEventListener('click', closeCard);

    // إغلاق عند الضغط على الـ backdrop
    backdrop.addEventListener('click', closeCard);

    // حفظ العلامة
    document.getElementById('btn-save').addEventListener('click', () => {
        const desc = document.getElementById('bookmark-desc').value.trim() || 'بدون وصف';

        // ✅ هنا يمكنك حفظ البيانات في chrome.storage
        console.log(`📌 تم الحفظ: الوقت ${formattedTime} - الوصف: "${desc}"`);

        // مثال: حفظ في localStorage مؤقتاً
        const bookmarks = JSON.parse(localStorage.getItem('yt_bookmarks') || '[]');
        bookmarks.push({
            time: currentTime,
            formatted: formattedTime,
            description: desc,
            url: window.location.href,
            title: document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 'فيديو',
            date: new Date().toISOString()
        });
        localStorage.setItem('yt_bookmarks', JSON.stringify(bookmarks));

        // رسالة نجاح
        showToast(`✅ تم حفظ العلامة عند ${formattedTime}`);

        closeCard();
    });

    // التركيز التلقائي على حقل الإدخال
    setTimeout(() => {
        const input = document.getElementById('bookmark-desc');
        if (input) input.focus();
    }, 150);
}

// ========================================================
// دالة عرض إشعار (Toast) بسيط
// ========================================================
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a1a;
        color: white;
        padding: 12px 28px;
        border-radius: 8px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 100000;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        direction: rtl;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ========================================================
// مراقبة التغييرات وإعادة حقن الزر عند الحاجة
// ========================================================
const injectShortcutIconObserver = new MutationObserver(() => {
    injectPremiumBookmarkButton();
});
injectShortcutIconObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// تنفيذ الفحص الأولي
setTimeout(injectPremiumBookmarkButton, 1000);

// ========================================================
// مستمع الرسائل من الـ Popup للتحكم
// ========================================================
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
    }

    // 2. الانتقال إلى توقيت معين
    if (request.action === "SEEK_TO") {
        video.currentTime = request.seconds;
        video.play();
        sendResponse({ success: true });
    }

    // 3. تشغيل ميزة التكرار الذكي
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
                    showToast(`⏹️ تم إيقاف التكرار بعد ${counter + 1} مرات`);
                } else {
                    video.currentTime = startSecs;
                    counter++;
                    console.log(`🔄 تكرار #${counter + 1}`);
                }
            }
        }, 200);
        sendResponse({ success: true });
    }

    // 4. إيقاف التكرار
    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
        showToast('⏹️ تم إيقاف التكرار');
        sendResponse({ success: true });
    }

    // 5. فتح الكارت الأبيض من الـ Popup
    if (request.action === "OPEN_WHITE_CARD") {
        const currentTime = video.currentTime;
        showWhiteCard(currentTime, formatTime(currentTime));
        sendResponse({ success: true });
    }

    return true;
});

// ========================================================
// دالة تحويل الوقت النصي إلى ثوانٍ
// ========================================================
function convertTimeToSeconds(str) {
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.length === 2) return (p[0] * 60) + p[1];
    if (p.length === 3) return (p[0] * 3600) + (p[1] * 60) + p[2];
    return p[0] || 0;
}

console.log('🚀 YouTube Bookmarks Premium - تم التحميل بنجاح!');