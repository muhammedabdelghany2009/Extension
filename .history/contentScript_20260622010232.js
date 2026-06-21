let loopIntervalTimer = null;

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
                alert('لم يتم العثور على مشغل الفيديو!');
                return;
            }

            videoElement.pause();
            const currentTime = videoElement.currentTime;
            showWhiteCard(currentTime);
        });

        youtubeControlsRight.insertBefore(quickBtn, youtubeControlsRight.firstChild);
    }
}

function showWhiteCard(currentTime) {
    const existingCard = document.getElementById('yt-custom-white-card');
    if (existingCard) existingCard.remove();

    const formattedTime = formatTime(currentTime);

    const backdrop = document.createElement('div');
    backdrop.id = 'yt-white-card-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 99998;
        animation: fadeIn 0.2s ease;
    `;

    const card = document.createElement('div');
    card.id = 'yt-custom-white-card';
    card.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 20px;
        padding: 35px 40px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.4);
        z-index: 99999;
        min-width: 380px;
        max-width: 450px;
        font-family: 'Segoe UI', 'YouTube Sans', Roboto, sans-serif;
        direction: rtl;
        text-align: right;
        animation: slideUp 0.3s ease;
    `;

    card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
            <span style="font-size:24px;">📌</span>
            <h3 style="margin:0; color:#1a1a1a; font-size:18px; font-weight:600;">حفظ علامة عند توقيت:</h3>
            <span style="background:#e8f5e9; color:#2e7d32; padding:4px 16px; border-radius:20px; font-size:18px; font-weight:700; font-family:'Courier New',monospace;">${formattedTime}</span>
        </div>
        <p style="color:#666; font-size:14px; margin:8px 0 16px 0;">وصف أو عنوان اللحظة الحالية</p>
        <input type="text" id="white-card-input" placeholder="اكتب وصفاً سريعاً هنا..." style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 15px;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 20px;
            font-family: inherit;
            transition: border 0.2s ease;
        ">
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="white-card-cancel" style="
                padding: 10px 24px;
                border: none;
                border-radius: 10px;
                background: #f0f0f0;
                color: #333;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: background 0.15s ease;
            ">إلغاء</button>
            <button id="white-card-save" style="
                padding: 10px 24px;
                border: none;
                border-radius: 10px;
                background: #065fd4;
                color: white;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: background 0.15s ease;
            ">💾 حفظ الآن</button>
        </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -40%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        const input = document.getElementById('white-card-input');
        if (input) input.focus();
    }, 200);

    document.getElementById('white-card-cancel').addEventListener('click', () => {
        card.remove();
        backdrop.remove();
    });

    document.getElementById('white-card-save').addEventListener('click', () => {
        const input = document.getElementById('white-card-input');
        const description = input.value.trim() || 'بدون وصف';

        saveBookmark(currentTime, formattedTime, description);

        card.remove();
        backdrop.remove();
        showToast('تم حفظ العلامة بنجاح!');
    });

    document.getElementById('white-card-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('white-card-save').click();
        }
    });

    backdrop.addEventListener('click', () => {
        card.remove();
        backdrop.remove();
    });
}

function saveBookmark(currentTime, formattedTime, description) {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 'فيديو بدون عنوان';
    const channelName = document.querySelector('#owner #channel-name a')?.textContent?.trim() || 'قناة غير معروفة';
    const videoId = window.location.search.split('v=')[1]?.split('&')[0] || 'unknown';

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};
        let videoData = data[videoId] || {
            title: videoTitle,
            channel: channelName,
            url: window.location.href,
            markers: []
        };

        videoData.markers.push({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
            title: description,
            time: formattedTime,
            seconds: currentTime,
            createdAt: new Date().toISOString()
        });

        data[videoId] = videoData;
        chrome.storage.local.set({ yt_bookmarks_data: data });
    });
}

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
        border-radius: 10px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 100000;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        direction: rtl;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

const observer = new MutationObserver(() => {
    injectPremiumBookmarkButton();
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});

setTimeout(injectPremiumBookmarkButton, 1500);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');
    if (!video) {
        sendResponse({ error: 'No video found' });
        return true;
    }

    if (request.action === "GET_CURRENT_TIME") {
        sendResponse({
            time: video.currentTime,
            formatted: formatTime(video.currentTime)
        });
        return true;
    }

    if (request.action === "SEEK_TO") {
        video.currentTime = request.seconds;
        video.play();
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "OPEN_WHITE_CARD") {
        showWhiteCard(video.currentTime);
        sendResponse({ success: true });
        return true;
    }

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

    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
        sendResponse({ success: true });
        return true;
    }

    return true;
});

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

