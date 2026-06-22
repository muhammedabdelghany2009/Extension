let currentVideoId = "default_video";
let currentVideoTitle = "فيديو يوتيوب نشط";
let temporarySeconds = 0;
let temporaryFormattedTime = "00:00";
let allBookmarksData = {};
let isLoopRunning = false;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('addBookmarkBtn').addEventListener('click', askAndAddNewMarker);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentVideoMarkers);
    document.getElementById('searchSavedVideos').addEventListener('input', searchInSavedVideosHistory);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startLoopSequence);
    document.getElementById('stopLoopBtn').addEventListener('click', stopLoopSequence);

    setupTabsNavigation();
    loadAllData();
    executeDirectDynamicCheck();

    chrome.runtime.sendMessage({ action: "CHECK_LOOP_STATUS" }, (response) => {
        if (response && response.isRunning) {
            isLoopRunning = true;
            document.getElementById('startLoopBtn').classList.add('hidden');
            document.getElementById('stopLoopBtn').classList.remove('hidden');
        }
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "TRIGGER_POPUP_ADD") {
            askAndAddNewMarker();
        }
        if (request.action === "LOOP_FINISHED") {
            isLoopRunning = false;
            document.getElementById('startLoopBtn').classList.remove('hidden');
            document.getElementById('stopLoopBtn').classList.add('hidden');
            showToast(`⏹️ اكتمل التكرار (${request.count} مرات) والفيديو متوقف`);
        }
        if (request.action === "LOOP_STOPPED") {
            isLoopRunning = false;
            document.getElementById('startLoopBtn').classList.remove('hidden');
            document.getElementById('stopLoopBtn').classList.add('hidden');
        }
        if (request.action === "LOOP_RUNNING") {
            isLoopRunning = true;
            document.getElementById('startLoopBtn').classList.add('hidden');
            document.getElementById('stopLoopBtn').classList.remove('hidden');
        }
    });
});

function loadAllData() {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        allBookmarksData = result.yt_bookmarks_data || {};
        refreshAllVideosHistoryList();
    });
}

async function executeDirectDynamicCheck() {
    const errorScreen = document.getElementById('errorScreen');
    const mainContent = document.getElementById('mainContent');
    const errorBtn = errorScreen.querySelector('.btn-gradient');
    const errorTitle = errorScreen.querySelector('h4');
    const errorText = errorScreen.querySelector('p');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    const pageTitle = (currentTab && currentTab.title) ? currentTab.title : "";
    const pageUrl = (currentTab && currentTab.url) ? currentTab.url.toLowerCase() : "";

    if (pageUrl !== "" && !pageUrl.includes("youtube.com") && !pageUrl.includes("youtu.be")) {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');
        errorTitle.textContent = "عذرًا، أنت لست داخل يوتيوب!";
        errorBtn.classList.remove('hidden');
        errorBtn.textContent = "الانتقال إلى منصة يوتيوب 🚀";
        errorBtn.href = "https://youtube.com";
        return;
    }

    const isMainOrSearchPage = pageTitle === "YouTube" || pageTitle.includes("الصفحة الرئيسية") || pageTitle.includes("Search") || (!pageUrl.includes("watch") && !pageUrl.includes("shorts"));

    if (isMainOrSearchPage) {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');
        errorTitle.textContent = "من فضلك حدد فيديو فقط 📺";
        errorText.textContent = "";
        errorBtn.classList.add('hidden');
        return;
    }

    errorScreen.classList.add('hidden');
    mainContent.classList.remove('hidden');

    currentVideoTitle = pageTitle;
    document.getElementById('videoTitle').textContent = currentVideoTitle;

    const urlParams = new URLSearchParams(currentTab.url.split('?')[1]);
    currentVideoId = urlParams.get('v') || 'default_video';

    loadCurrentVideoMarkersFromStorage();
}

function setupTabsNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

async function askAndAddNewMarker() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CURRENT_TIME" }, (response) => {
        temporarySeconds = response && response.time ? response.time : 0;
        temporaryFormattedTime = formatSecondsToTime(temporarySeconds);

        const quickAddContainer = document.getElementById('quickAddContainer');
        const inputField = document.getElementById('customMarkerTitleInput');

        document.getElementById('capturedTimeBadge').textContent = temporaryFormattedTime;
        quickAddContainer.classList.remove('hidden');

        const videoId = currentVideoId;
        chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
            const data = result.yt_bookmarks_data || {};
            const videoData = data[videoId];
            const markers = videoData?.markers || [];

            const existingMarker = markers.find(m => Math.abs(m.seconds - temporarySeconds) < 0.5);
            if (existingMarker) {
                inputField.placeholder = `⚠️ علامة موجودة: "${existingMarker.title}"`;
                inputField.style.borderColor = '#ffc107';
                inputField.style.background = '#fff3cd';
            } else if (markers.length > 0) {
                const lastMarker = markers[markers.length - 1];
                inputField.placeholder = `آخر وصف: "${lastMarker.title}"`;
                inputField.style.borderColor = '';
                inputField.style.background = '';
            } else {
                inputField.placeholder = "اكتب وصفاً سريعاً هنا...";
                inputField.style.borderColor = '';
                inputField.style.background = '';
            }
        });

        inputField.value = "";
        inputField.focus();

        document.getElementById('saveCustomMarkerBtn').onclick = saveCustomMarkerFromInlineForm;
        document.getElementById('cancelCustomMarkerBtn').onclick = () => {
            quickAddContainer.classList.add('hidden');
            const input = document.getElementById('customMarkerTitleInput');
            input.style.borderColor = '';
            input.style.background = '';
        };

        inputField.onkeydown = (e) => {
            if (e.key === 'Enter') saveCustomMarkerFromInlineForm();
        };
    });
}

function saveCustomMarkerFromInlineForm() {
    const inputField = document.getElementById('customMarkerTitleInput');
    const markerTitle = inputField.value.trim();

    if (!markerTitle) {
        inputField.style.borderColor = '#ef4444';
        inputField.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        setTimeout(() => {
            inputField.style.borderColor = '';
            inputField.style.boxShadow = '';
        }, 2000);
        return;
    }

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        const data = result.yt_bookmarks_data || {};
        const videoData = data[currentVideoId];
        const markers = videoData?.markers || [];

        const existingMarker = markers.find(m => Math.abs(m.seconds - temporarySeconds) < 0.5);
        if (existingMarker) {
            showToast(`⚠️ تم إضافة علامة من قبل في هذا التوقيت: "${existingMarker.title}"`);
            return;
        }

        saveBookmarkToStorage(currentVideoId, currentVideoTitle, markerTitle, temporaryFormattedTime, temporarySeconds);
        document.getElementById('quickAddContainer').classList.add('hidden');
        const input = document.getElementById('customMarkerTitleInput');
        input.style.borderColor = '';
        input.style.background = '';
    });
}

function saveBookmarkToStorage(videoId, videoTitle, markerTitle, formattedTime, seconds) {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};

        if (!data[videoId]) {
            data[videoId] = {
                title: videoTitle,
                channel: 'قناة يوتيوب',
                url: `https://youtube.com/watch?v=${videoId}`,
                markers: []
            };
        }

        data[videoId].markers.push({
            id: generateUniqueId(),
            title: markerTitle,
            time: formattedTime,
            seconds: seconds,
            createdAt: new Date().toISOString()
        });

        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            allBookmarksData = data;
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            showToast('تم حفظ العلامة بنجاح!');
        });
    });
}

function loadCurrentVideoMarkersFromStorage() {
    const list = document.getElementById('markersList');
    list.innerHTML = '';

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        const data = result.yt_bookmarks_data || {};
        const videoData = data[currentVideoId];

        if (!videoData || !videoData.markers || videoData.markers.length === 0) {
            list.innerHTML = `
                <div class="status-empty-msg">
                    <div style="font-size:40px; margin-bottom:10px;">📭</div>
                    <p>لا توجد علامات بعد</p>
                    <p style="font-size:12px; color:#cbd5e1;">اضغط على الزر في الأعلى لحفظ أول علامة</p>
                </div>
            `;
            return;
        }

        const sortedMarkers = [...videoData.markers].sort((a, b) => a.seconds - b.seconds);

        sortedMarkers.forEach((marker) => {
            const li = document.createElement('li');
            li.className = 'marker-item';

            const markerContent = document.createElement('div');
            markerContent.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                cursor: pointer;
                min-width: 0;
            `;
            markerContent.innerHTML = `
                <span style="font-size:18px;">📌</span>
                <span class="marker-title">${escapeHtml(marker.title)}</span>
                <span class="badge">⏱️ ${marker.time}</span>
            `;

            markerContent.addEventListener('click', async () => {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", seconds: marker.seconds });
            });

            const actions = document.createElement('div');
            actions.className = 'marker-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'تعديل';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showEditDialog(marker.id, marker.title);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'حذف';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteMarker(marker.id);
            });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            li.appendChild(markerContent);
            li.appendChild(actions);
            list.appendChild(li);
        });
    });
}

function showEditDialog(markerId, currentTitle) {
    const overlay = document.createElement('div');
    overlay.className = 'edit-dialog-overlay';
    overlay.innerHTML = `
        <div class="dialog-box">
            <div class="dialog-header">
                <span style="font-size:24px;">✏️</span>
                <h3>تعديل العلامة</h3>
            </div>
            <p class="dialog-sub">قم بتعديل وصف العلامة المرجعية</p>
            <input type="text" id="editMarkerInput" value="${escapeHtml(currentTitle)}">
            <div class="dialog-actions">
                <button class="cancel-btn" id="editCancelBtn">إلغاء</button>
                <button class="save-btn" id="editSaveBtn">💾 حفظ التعديل</button>
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
        updateMarkerTitle(markerId, newTitle);
        overlay.remove();
    });
    document.getElementById('editMarkerInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('editSaveBtn').click();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function updateMarkerTitle(markerId, newTitle) {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};
        let videoData = data[currentVideoId];
        if (!videoData) return;

        const markerIndex = videoData.markers.findIndex(m => m.id === markerId);
        if (markerIndex === -1) return;

        videoData.markers[markerIndex].title = newTitle;
        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            allBookmarksData = data;
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            showToast('تم تحديث الوصف بنجاح!');
        });
    });
}

function deleteMarker(markerId) {
    if (!confirm('هل أنت متأكد من حذف هذه العلامة؟')) return;

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};
        let videoData = data[currentVideoId];
        if (!videoData) return;

        videoData.markers = videoData.markers.filter(m => m.id !== markerId);

        if (videoData.markers.length === 0) {
            delete data[currentVideoId];
        }

        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            allBookmarksData = data;
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            showToast('تم حذف العلامة بنجاح!');
        });
    });
}

function refreshAllVideosHistoryList() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';

    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        const data = result.yt_bookmarks_data || {};
        const keys = Object.keys(data);

        if (keys.length === 0) {
            historyList.innerHTML = `
                <div class="status-empty-msg">
                    <div style="font-size:48px; margin-bottom:12px;">📭</div>
                    <p>لا توجد فيديوهات محفوظة</p>
                </div>
            `;
            return;
        }

        keys.forEach(key => {
            const videoData = data[key];
            if (videoData && videoData.markers && videoData.markers.length > 0) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="video-row-header">
                        <div class="channel-info">
                            <div class="channel-logo">YT</div>
                            <span class="channel-name">${escapeHtml(videoData.channel || 'قناة يوتيوب')}</span>
                        </div>
                        <span class="marker-count-badge">${videoData.markers.length} علامات</span>
                    </div>
                    <div class="history-video-title">${escapeHtml(videoData.title)}</div>
                    <div class="sub-markers-list hidden"></div>
                `;

                li.addEventListener('click', () => {
                    const subList = li.querySelector('.sub-markers-list');
                    if (subList.classList.contains('hidden')) {
                        subList.classList.remove('hidden');
                        subList.innerHTML = '';
                        videoData.markers.forEach(marker => {
                            const div = document.createElement('div');
                            div.className = 'sub-marker-item';
                            div.innerHTML = `
                                <span>📌 ${escapeHtml(marker.title)}</span>
                                <span class="marker-time">${marker.time}</span>
                            `;
                            div.addEventListener('click', async (event) => {
                                event.stopPropagation();
                                chrome.tabs.create({ url: `https://youtube.com/watch?v=${key}&t=${Math.floor(marker.seconds)}s` });
                            });
                            subList.appendChild(div);
                        });
                    } else {
                        subList.classList.add('hidden');
                    }
                });

                historyList.appendChild(li);
            }
        });
    });
}

function searchCurrentVideoMarkers(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#markersList li');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

function searchInSavedVideosHistory(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#allVideosList li');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

function exportStorageToJson() {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        const data = result.yt_bookmarks_data || {};
        const currentVideoData = data[currentVideoId];

        if (!currentVideoData || !currentVideoData.markers || currentVideoData.markers.length === 0) {
            showToast('لا توجد علامات لتصديرها لهذا الفيديو');
            return;
        }

        const exportData = {
            videoId: currentVideoId,
            videoTitle: currentVideoTitle,
            channel: currentVideoData.channel || 'قناة يوتيوب',
            url: currentVideoData.url || `https://youtube.com/watch?v=${currentVideoId}`,
            exportedAt: new Date().toISOString(),
            markers: currentVideoData.markers.map(m => ({
                title: m.title,
                time: m.time,
                seconds: m.seconds,
                created: m.createdAt
            }))
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const fileName = currentVideoTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').trim().slice(0, 50) || 'bookmarks';
        a.download = `${fileName}_bookmarks.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast(`📤 تم تصدير "${currentVideoTitle}" بنجاح!`);
    });
}

function importStorageFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const importedData = JSON.parse(evt.target.result);

            if (!importedData.markers || !Array.isArray(importedData.markers)) {
                alert('❌ هذا الملف لا يحتوي على علامات صالحة');
                return;
            }

            const isCurrentVideo = importedData.videoId === currentVideoId;
            const importedVideoTitle = importedData.videoTitle || 'فيديو غير معروف';

            if (isCurrentVideo) {
                const confirmMsg = `هل تريد استيراد ${importedData.markers.length} علامات للفيديو الحالي "${currentVideoTitle}"؟`;
                if (confirm(confirmMsg)) {
                    importMarkersToVideo(importedData, currentVideoId, currentVideoTitle);
                }
            } else {
                const msg = `⚠️ هذا الملف يحتوي على علامات لفيديو آخر:\n\n"${importedVideoTitle}"\n\nعدد العلامات: ${importedData.markers.length}\n\nماذا تريد أن تفعل؟`;
                const choice = confirm(msg + '\n\nاضغط "موافق" لاستيرادها للفيديو الحالي\nاضغط "إلغاء" للإلغاء');

                if (choice) {
                    const confirmAgain = confirm(`تأكيد: استيراد علامات "${importedVideoTitle}" إلى الفيديو الحالي "${currentVideoTitle}"؟`);
                    if (confirmAgain) {
                        importMarkersToVideo(importedData, currentVideoId, currentVideoTitle);
                    }
                }
            }
        } catch (err) {
            alert('❌ الملف غير صالح. تأكد من أنه ملف JSON صحيح.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function importMarkersToVideo(importedData, targetVideoId, targetVideoTitle) {
    chrome.storage.local.get(['yt_bookmarks_data'], (result) => {
        let data = result.yt_bookmarks_data || {};

        if (!data[targetVideoId]) {
            data[targetVideoId] = {
                title: targetVideoTitle,
                channel: importedData.channel || 'قناة يوتيوب',
                url: `https://youtube.com/watch?v=${targetVideoId}`,
                markers: []
            };
        }

        const existingTimes = new Set(data[targetVideoId].markers.map(m => Math.round(m.seconds)));

        let addedCount = 0;
        let skippedCount = 0;

        importedData.markers.forEach(m => {
            const roundedSeconds = Math.round(m.seconds || 0);
            if (!existingTimes.has(roundedSeconds)) {
                data[targetVideoId].markers.push({
                    id: generateUniqueId(),
                    title: m.title || 'بدون وصف',
                    time: m.time || formatSecondsToTime(m.seconds || 0),
                    seconds: m.seconds || 0,
                    createdAt: m.created || new Date().toISOString()
                });
                existingTimes.add(roundedSeconds);
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        chrome.storage.local.set({ yt_bookmarks_data: data }, () => {
            allBookmarksData = data;
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();

            let msg = `✅ تم استيراد ${addedCount} علامة`;
            if (skippedCount > 0) {
                msg += ` (تم تخطي ${skippedCount} علامة مكررة)`;
            }
            showToast(msg);
        });
    });
}

async function startLoopSequence() {
    const from = document.getElementById('loopFrom').value;
    const to = document.getElementById('loopTo').value;
    const count = document.getElementById('loopCount').value;

    if (!from || !to) {
        showToast('فضلاً أدخل نطاق الوقت!');
        return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count });
    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
    window.close();
}

async function stopLoopSequence() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" });
    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
    window.close();
}

function showToast(message) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function formatSecondsToTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .custom-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: white;
        padding: 14px 30px;
        border-radius: 14px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 99999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        animation: slideUp 0.3s ease;
        direction: rtl;
        text-align: center;
        max-width: 90%;
        border: 1px solid rgba(255,255,255,0.1);
    }
    .edit-dialog-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
        backdrop-filter: blur(4px);
    }
    .dialog-box {
        background: white;
        border-radius: 20px;
        padding: 30px 35px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        direction: rtl;
        text-align: right;
        animation: slideUp 0.25s ease;
    }
    .dialog-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
    }
    .dialog-header h3 {
        margin: 0;
        color: #1a1a1a;
        font-size: 20px;
    }
    .dialog-sub {
        color: #64748b;
        font-size: 13px;
        margin-bottom: 18px;
    }
    .dialog-box input {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 15px;
        outline: none;
        box-sizing: border-box;
        margin-bottom: 20px;
        font-family: 'Cairo', sans-serif;
        transition: border 0.2s ease;
    }
    .dialog-box input:focus {
        border-color: #3b82f6;
    }
    .dialog-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    .dialog-actions .cancel-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 10px;
        background: #f1f5f9;
        color: #475569;
        cursor: pointer;
        font-weight: 600;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        transition: background 0.15s ease;
    }
    .dialog-actions .cancel-btn:hover {
        background: #e2e8f0;
    }
    .dialog-actions .save-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 10px;
        background: #3b82f6;
        color: white;
        cursor: pointer;
        font-weight: 600;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        transition: background 0.15s ease;
    }
    .dialog-actions .save-btn:hover {
        background: #2563eb;
    }
`;
document.head.appendChild(styleSheet);