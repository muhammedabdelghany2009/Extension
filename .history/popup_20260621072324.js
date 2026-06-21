let currentVideoId = "default_video";
let currentVideoTitle = "فيديو يوتيوب نشط";
let temporarySeconds = 0;
let temporaryFormattedTime = "00:00";

document.addEventListener('DOMContentLoaded', async () => {
    // تفعيل مستمعات الأزرار فوراً
    document.getElementById('addBookmarkBtn').addEventListener('click', askAndAddNewMarker);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentVideoMarkers);
    document.getElementById('searchSavedVideos').addEventListener('input', searchInSavedVideosHistory);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startLoopSequence);
    document.getElementById('stopLoopBtn').addEventListener('click', stopLoopSequence);

    setupTabsNavigation();
    refreshAllVideosHistoryList();
    executeDirectDynamicCheck();

    // 🎯 الرابط السحري: الاستماع لإشارة الدبوس السفلي اللي جنب الإعدادات
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "TRIGGER_POPUP_ADD") {
            // تشغيل فتح الكارت الأبيض الفاخر فوراً بالوقت الحالي!
            askAndAddNewMarker();
        }
    });
});

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

    // توليد معرف فريد ثابت للفيديو الحالي لمنع التداخل
    currentVideoId = btoa(unescape(encodeURIComponent(currentVideoTitle))).substring(0, 15);
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

// فتح الكارت الأبيض الجميل (المدمج) ولقط الوقت حياً تلقائياً
async function askAndAddNewMarker() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CURRENT_TIME" }, (response) => {
        temporarySeconds = response && response.time ? response.time : 0;
        temporaryFormattedTime = formatSecondsToTime(temporarySeconds);

        const quickAddContainer = document.getElementById('quickAddContainer');
        const inputField = document.getElementById('customMarkerTitleInput');

        document.getElementById('capturedTimeBadge').textContent = temporaryFormattedTime;
        quickAddContainer.classList.remove('hidden');

        inputField.value = "";
        inputField.focus(); // المؤشر جاهز للكتابة فوراً

        document.getElementById('saveCustomMarkerBtn').onclick = saveCustomMarkerFromInlineForm;
        document.getElementById('cancelCustomMarkerBtn').onclick = () => quickAddContainer.classList.add('hidden');

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
        return;
    }

    chrome.storage.local.get([currentVideoId], (result) => {
        let videoData = result[currentVideoId] || { title: currentVideoTitle, markers: [] };
        videoData.markers.push({ id: generateUniqueId(), title: markerTitle, time: temporaryFormattedTime, seconds: temporarySeconds });

        chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            document.getElementById('quickAddContainer').classList.add('hidden');
        });
    });
}

function loadCurrentVideoMarkersFromStorage() {
    const list = document.getElementById('markersList');
    list.innerHTML = '';
    chrome.storage.local.get([currentVideoId], (result) => {
        const videoData = result[currentVideoId];
        if (!videoData || !videoData.markers || videoData.markers.length === 0) {
            list.innerHTML = '<div class="status-empty-msg">اضغط على الزر في الأعلى لحفظ أول علامة مرجعية هنا!</div>';
            return;
        }
        videoData.markers.forEach(marker => {
            const li = document.createElement('li');
            li.innerHTML = `<span>📌 ${marker.title}</span> <span class="badge">⏱️ ${marker.time}</span>`;
            li.addEventListener('click', async () => {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", seconds: marker.seconds });
            });
            list.appendChild(li);
        });
    });
}

// ميزة المحفوظات الفخمة المنسقة على عدة سطور ومع لوجو القناة
function refreshAllVideosHistoryList() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';

    chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items).filter(k => k !== "extension_initialized");
        if (keys.length === 0) {
            historyList.innerHTML = '<div class="status-empty-msg">لم يتم العثور على فيديوهات محفوظة.</div>';
            return;
        }

        keys.forEach(key => {
            const videoData = items[key];
            if (videoData && videoData.title) {
                const li = document.createElement('li');
                li.style.flexDirection = 'column';
                li.style.alignItems = 'stretch';
                li.style.padding = '12px';

                li.innerHTML = `
          <div class="video-row-header" style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom: 6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="channel-logo-badge" style="background:#ff0000; color:white; border-radius:50%; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink: 0;">YT</span>
              <span style="font-weight:700; font-size:12px; color:#6366f1;">قناة يوتيوب</span>
            </div>
            <span class="badge" style="background:#e8f5e9; color:#2e7d32; flex-shrink: 0;">${videoData.markers.length} علامات</span>
          </div>
          
          <div class="history-video-title" style="font-weight:600; font-size:13px; color:#1e293b; line-height:1.5; white-space:normal; word-break:break-word; text-align:right;">
            ${videoData.title}
          </div>
          <div class="sub-markers-list hidden" style="margin-top:10px; padding-top:8px; border-top:1px dashed #e2e8f0;"></div>
        `;

                li.addEventListener('click', () => {
                    const subList = li.querySelector('.sub-markers-list');
                    if (subList.classList.contains('hidden')) {
                        subList.classList.remove('hidden');
                        subList.innerHTML = '';
                        videoData.markers.forEach(marker => {
                            const div = document.createElement('div');
                            div.style.cssText = 'display:flex; justify-content:space-between; padding:8px; background:#f8fafc; margin-bottom:4px; border-radius:6px; font-size:12px; cursor:pointer;';
                            div.innerHTML = `<span>📌 ${marker.title}</span> <span style="color:#3b82f6; font-weight:bold;">${marker.time}</span>`;

                            div.addEventListener('click', async (event) => {
                                event.stopPropagation();
                                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                                chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", seconds: marker.seconds });
                            });
                            subList.appendChild(div);
                        });
                    } else { subList.classList.add('hidden'); }
                });
                historyList.appendChild(li);
            }
        });
    });
}

function searchCurrentVideoMarkers(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#markersList li');
    items.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none'; });
}

function searchInSavedVideosHistory(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#allVideosList li');
    items.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none'; });
} function exportStorageToJson() {
    chrome.storage.local.get(null, (data) => {
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a'); a.setAttribute("href", jsonString); a.setAttribute("download", "YT_Bookmarks_Database.json");
        document.body.appendChild(a); a.click(); a.remove();
    });
}
function importStorageFromJson(e) {
    const file = e.target.files; if (!file) return;
    const reader = new FileReader(); reader.onload = function (evt) {
        try {
            chrome.storage.local.set(JSON.parse(evt.target.result), () => {
                executeDirectDynamicCheck();
                refreshAllVideosHistoryList();
            });
        } catch (err) { alert('الملف غير صالح.'); }
    }; reader.readAsText(file);
}
async function startLoopSequence() {
    const from = document.getElementById('loopFrom').value; const to = document.getElementById('loopTo').value;
    const count = document.getElementById('loopCount').value; if (!from || !to) return alert("فضلاً أدخل نطاق الوقت!");
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }); chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count });
    document.getElementById('startLoopBtn').classList.add('hidden'); document.getElementById('stopLoopBtn').classList.remove('hidden');
}
async function stopLoopSequence() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" }); document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}