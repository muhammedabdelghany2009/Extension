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

// دالة لإنشاء وعرض الكارت الأبيض في منتصف الشاشة
function showWhiteCard(currentTime) {
    // 1. إنشاء العنصر الحاوي للكارت
    const card = document.createElement('div');
    card.id = 'yt-custom-white-card';

    // 2. تصميم الكارت الداخلي (HTML) بناءً على صورتك الأولى
    card.innerHTML = `
        <div class="card-header">
            <span>حفظ علامة عند توقيت:</span>
            <span class="time-badge">${currentTime}</span>
        </div>
        <p class="card-sub">وصف أو عنوان اللحظة الحالية</p>
        <input type="text" id="bookmark-desc" placeholder="اكتب وصفاً سريعاً هنا للعلامة المرجعية..." />
        <div class="card-actions">
            <button id="btn-cancel">إلغاء</button>
            <button id="btn-save">حفظ الآن 💾</button>
        </div>
    `;

    document.body.appendChild(card);

    // 3. إضافة الأحداث (Event Listeners) للأزرار داخل الكارت
    document.getElementById('btn-cancel').addEventListener('click', () => {
        card.remove(); // إغلاق الكارت
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        const desc = document.getElementById('bookmark-desc').value;
        // هنا تضع منطق الحفظ الخاص بك (مثلاً إرساله للـ chrome.storage)
        console.log(`Saved: ${currentTime} - ${desc}`);
        card.remove(); // إغلاق الكارت بعد الحفظ
    });
}

// مثال: اربط الدالة بزر اليوتيوب الذي قمت بصناعته بجانب الإعدادات
const myYoutubeButton = document.querySelector('.your-custom-youtube-btn');
if (myYoutubeButton) {
    myYoutubeButton.addEventListener('click', () => {
        // احصل على توقيت الفيديو الحالي من مشغل يوتيوب
        const videoElement = document.querySelector('video');
        const timeInSeconds = videoElement ? videoElement.currentTime : 0;

        // تحويل الثواني إلى صيغة 00:02 مثلاً
        const formattedTime = new Date(timeInSeconds * 1000).toISOString().substr(14, 5);

        // استدعاء الكارت فوراً في منتصف الشاشة
        showWhiteCard(formattedTime);
    });
}
