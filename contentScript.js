let loopIntervalTimer = null;

function injectPremiumBookmarkButton() {
    const youtubeControlsRight = document.querySelector('.ytp-right-controls');

    if (youtubeControlsRight && !document.getElementById('yt-bookmarks-quick-btn')) {
        const quickBtn = document.createElement('button');
        quickBtn.id = 'yt-bookmarks-quick-btn';
        quickBtn.className = 'ytp-button';
        quickBtn.title = '📌 Save Bookmark';
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
                alert('Video player not found!');
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
    const videoId = window.location.search.split('v=')[1]?.split('&')[0] || 'unknown';

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        const data = result.yt_bookmarks_data || {};
        const videoData = data[videoId];
        const markers = videoData?.markers || [];
        const sortedMarkers = [...markers].sort((a, b) => a.seconds - b.seconds);

        const existingMarker = sortedMarkers.find(m => Math.abs(m.seconds - currentTime) < 0.5);

        const backdrop = document.createElement('div');
        backdrop.id = 'yt-white-card-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99998;
            animation: fadeIn 0.2s ease;
        `;

        backdrop.addEventListener('click', () => {
            card.remove();
            backdrop.remove();
        });

        const card = document.createElement('div');
        card.id = 'yt-custom-white-card';
        card.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 20px;
            padding: 30px 35px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.4);
            z-index: 99999;
            min-width: 420px;
            max-width: 500px;
            max-height: 85vh;
            overflow-y: auto;
            font-family: 'Segoe UI', 'YouTube Sans', Roboto, sans-serif;
            direction: rtl;
            text-align: right;
            animation: slideUp 0.3s ease;
        `;

        let warningHtml = '';
        if (existingMarker) {
            warningHtml = `
                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    border-radius: 10px;
                    padding: 10px 14px;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <span style="font-size:18px;">⚠️</span>
                    <span style="font-size:13px; color:#856404;">
                        A bookmark already exists at this timestamp: 
                        <strong>"${escapeHtml(existingMarker.title)}"</strong>
                    </span>
                </div>
            `;
        }

        let markersHtml = '';
        if (sortedMarkers.length > 0) {
            markersHtml = `
                <div style="margin-top:14px; padding-top:12px; border-top:2px solid #e8e8e8;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:13px; font-weight:600; color:#666;">Previous bookmarks (${sortedMarkers.length})</span>
                    </div>
                    <div style="max-height:160px; overflow-y:auto;">
                        ${sortedMarkers.map(m => `
                            <div class="prev-marker-item" data-marker-id="${m.id}" data-seconds="${m.seconds}" data-title="${escapeHtml(m.title)}" style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 6px 10px;
                                margin-bottom: 3px;
                                background: #f5f5f5;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: background 0.1s ease;
                                font-size: 13px;
                            ">
                                <span style="display:flex; align-items:center; gap:6px; flex:1; min-width:0; cursor:pointer;" class="marker-click-area">
                                    <span>📌</span>
                                    <span style="white-space:normal; word-wrap:break-word; overflow-wrap:break-word; line-height:1.4; max-height:40px; overflow-y:auto;">${escapeHtml(m.title)}</span>
                                </span>
                                <span style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                                    <span style="color:#3b82f6; font-weight:600; font-family:'Courier New',monospace; font-size:12px;">${m.time}</span>
                                    <button class="reuse-title-btn" data-title="${escapeHtml(m.title)}" style="
                                        background:#fbbf24;
                                        border:none;
                                        border-radius:4px;
                                        padding:2px 6px;
                                        cursor:pointer;
                                        font-size:11px;
                                        transition:transform 0.1s ease;
                                    ">↺</button>
                                    <button class="edit-marker-btn" data-marker-id="${m.id}" data-title="${escapeHtml(m.title)}" style="
                                        background:#60a5fa;
                                        border:none;
                                        border-radius:4px;
                                        padding:2px 6px;
                                        cursor:pointer;
                                        font-size:11px;
                                        color:white;
                                        transition:transform 0.1s ease;
                                    ">✏️</button>
                                    <button class="delete-marker-btn" data-marker-id="${m.id}" style="
                                        background:#ef4444;
                                        border:none;
                                        border-radius:4px;
                                        padding:2px 6px;
                                        cursor:pointer;
                                        font-size:11px;
                                        color:white;
                                        transition:transform 0.1s ease;
                                    ">🗑️</button>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap;">
                <span style="font-size:24px;">📌</span>
                <h3 style="margin:0; color:#1a1a1a; font-size:18px; font-weight:600;">Save bookmark at:</h3>
                <span style="background:#e8f5e9; color:#2e7d32; padding:4px 16px; border-radius:20px; font-size:18px; font-weight:700; font-family:'Courier New',monospace;">${formattedTime}</span>
                ${sortedMarkers.length > 0 ? `<span style="background:#e3f2fd; color:#1565c0; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:600;">${sortedMarkers.length} bookmarks</span>` : ''}
            </div>
            ${warningHtml}
            <p style="color:#666; font-size:14px; margin:8px 0 12px 0;">Description for this moment</p>
            <textarea id="white-card-input" placeholder="Write a quick description here ..." style="
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                font-size: 15px;
                outline: none;
                box-sizing: border-box;
                margin-bottom: 4px;
                font-family: inherit;
                transition: border 0.2s ease;
                resize: vertical;
                min-height: 50px;
                max-height: 120px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
            "></textarea>
            ${markersHtml}
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
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
                ">Cancel</button>
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
                ">💾 Save الآن</button>
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
            .prev-marker-item:hover {
                background: #e8e8e8 !important;
            }
            .reuse-title-btn:hover, .edit-marker-btn:hover, .delete-marker-btn:hover {
                transform: scale(1.1);
            }
            .marker-click-area {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            const input = document.getElementById('white-card-input');
            if (input) input.focus();
        }, 200);

        document.querySelectorAll('.marker-click-area').forEach(area => {
            area.addEventListener('click', function () {
                const parent = this.closest('.prev-marker-item');
                const seconds = parseFloat(parent.dataset.seconds);
                const video = document.querySelector('video');
                if (video) {
                    video.currentTime = seconds;
                    video.play();
                }
            });
        });

        document.querySelectorAll('.reuse-title-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const title = this.dataset.title;
                const input = document.getElementById('white-card-input');
                if (input) {
                    input.value = title;
                    input.focus();
                    input.select();
                }
            });
        });

        document.querySelectorAll('.edit-marker-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const markerId = this.dataset.markerId;
                const currentTitle = this.dataset.title;
                showEditMarkerDialog(markerId, currentTitle);
            });
        });

        document.querySelectorAll('.delete-marker-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const markerId = this.dataset.markerId;
                if (confirm('Are you sure this tag was successfully removed?')) {
                    deleteMarkerFromVideo(markerId, videoId, () => {
                        showWhiteCard(currentTime);
                    });
                }
            });
        });

        document.getElementById('white-card-cancel').addEventListener('click', () => {
            card.remove();
            backdrop.remove();
        });

        document.getElementById('white-card-save').addEventListener('click', () => {
            const input = document.getElementById('white-card-input');
            const description = input.value.trim() || 'No description';

            const existing = sortedMarkers.find(m => Math.abs(m.seconds - currentTime) < 0.5);
            if (existing) {
                showToast(`⚠️ A bookmark already exists at this timestamp: "${existing.title}"`);
                return;
            }

            saveBookmark(currentTime, formattedTime, description);
            showToast('The mark was successfully saved');
            showWhiteCard(currentTime);
        });

        document.getElementById('white-card-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('white-card-save').click();
            }
        });

        document.addEventListener('click', function outsideClick(e) {
            if (card && !card.contains(e.target) && !backdrop.contains(e.target)) {
                card.remove();
                backdrop.remove();
                document.removeEventListener('click', outsideClick);
            }
        });
    });
}

function showEditMarkerDialog(markerId, currentTitle) {
    const overlay = document.createElement('div');
    overlay.className = 'edit-dialog-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
        backdrop-filter: blur(4px);
    `;

    overlay.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 30px 35px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            direction: rtl;
            text-align: right;
            animation: slideUp 0.25s ease;
        ">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <span style="font-size:24px;">✏️</span>
                <h3 style="margin:0; color:#1a1a1a; font-size:20px;">Edit bookmark</h3>
            </div>
            <p style="color:#64748b; font-size:13px; margin-bottom:18px;">Edit the bookmark description</p>
            <input type="text" id="editMarkerInput" value="${escapeHtml(currentTitle)}" style="
                width: 100%;
                padding: 14px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                font-size: 15px;
                outline: none;
                box-sizing: border-box;
                margin-bottom: 20px;
                font-family: 'Segoe UI', sans-serif;
                transition: border 0.2s ease;
            ">
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="editCancelBtn" style="
                    padding: 10px 24px;
                    border: none;
                    border-radius: 10px;
                    background: #f1f5f9;
                    color: #475569;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.15s ease;
                ">Cancel</button>
                <button id="editSaveBtn" style="
                    padding: 10px 24px;
                    border: none;
                    border-radius: 10px;
                    background: #3b82f6;
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.15s ease;
                ">💾 Save التعديل</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        const input = document.getElementById('editMarkerInput');
        if (input) { input.focus(); input.select(); }
    }, 150);

    document.getElementById('editCancelBtn').addEventListener('click', () => overlay.remove());
    document.getElementById('editSaveBtn').addEventListener('click', () => {
        const newTitle = document.getElementById('editMarkerInput').value.trim();
        if (!newTitle) {
            showToast('الرجاء إدخال وصف صحيح');
            return;
        }
        const videoId = window.location.search.split('v=')[1]?.split('&')[0] || 'unknown';
        updateMarkerTitleInStorage(markerId, newTitle, videoId, () => {
            overlay.remove();
            const video = document.querySelector('video');
            if (video) showWhiteCard(video.currentTime);
        });
    });
    document.getElementById('editMarkerInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('editSaveBtn').click();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function updateMarkerTitleInStorage(markerId, newTitle, videoId, callback) {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};
        let videoData = data[videoId];
        if (!videoData) return;

        const markerIndex = videoData.markers.findIndex(m => m.id === markerId);
        if (markerIndex === -1) return;

        videoData.markers[markerIndex].title = newTitle;
        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            if (callback) callback();
        });
    });
}

function deleteMarkerFromVideo(markerId, videoId, callback) {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};
        let videoData = data[videoId];
        if (!videoData) return;

        videoData.markers = videoData.markers.filter(m => m.id !== markerId);

        if (videoData.markers.length === 0) {
            delete data[videoId];
        }

        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            if (callback) callback();
        });
    });
}

function saveBookmark(currentTime, formattedTime, description) {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 'Untitled video';
    const channelName = document.querySelector('#owner #channel-name a')?.textContent?.trim() || 'Unknown channel';
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
    const existing = document.querySelector('.loop-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'loop-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        animation: slideUp 0.3s ease;
        direction: rtl;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.1);
        pointer-events: none;
        max-width: 80%;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
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
        const isInfinite = request.count === 'infinite';
        const maxCount = parseInt(request.count);

        video.currentTime = startSecs;
        video.play();

        chrome.runtime.sendMessage({ action: "LOOP_RUNNING" });

        showToast(isInfinite ? '🔄 Starting infinite loop...' : `🔄 Starting loop (${maxCount} times)`);

        loopIntervalTimer = setInterval(() => {
            if (video.currentTime >= endSecs) {
                if (!isInfinite && counter >= maxCount - 1) {
                    clearInterval(loopIntervalTimer);
                    video.pause();
                    showToast(`⏹️ Loop finished (${maxCount} times) — video paused`);

                    chrome.runtime.sendMessage({
                        action: "LOOP_FINISHED",
                        count: maxCount
                    });
                } else {
                    video.currentTime = startSecs;
                    video.play();
                    counter++;
                    if (counter % 5 === 0 && !isInfinite) {
                        showToast(`🔄 Repeated ${counter} times out of ${maxCount}`);
                    }
                }
            }
        }, 200);

        sendResponse({ success: true });
        return true;
    }

    if (request.action === "STOP_LOOP") {
        clearInterval(loopIntervalTimer);
        video.pause();
        showToast('⏹️ Loop stopped — video paused');

        chrome.runtime.sendMessage({
            action: "LOOP_STOPPED"
        });

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

