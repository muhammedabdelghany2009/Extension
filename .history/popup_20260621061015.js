let currentVideoId = "";

document.addEventListener('DOMContentLoaded', async () => {
    const currentTab = await getActiveTabURL();
    const errorScreen = document.getElementById('errorScreen');
    const mainContent = document.getElementById('mainContent');

    if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
        errorScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        document.getElementById('videoTitle').textContent = currentTab.title || "فيديو يوتيوب نشط";

        const urlParams = new URLSearchParams(new URL(currentTab.url).search);
        currentVideoId = urlParams.get("v");
    } else {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');
        return;
    }

    setupTabsNavigation();
    document.getElementById('addBookmarkBtn').addEventListener('click', addNewMarkerHandler);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentMarkers);
    document.getElementById('searchVideoHistory').addEventListener('input', searchVideoHistoryHandler);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startVideoLoop);
    document.getElementById('stopLoopBtn').addEventListener('click', stopVideoLoop);

    loadCurrentMarkersFromStorage();
    refreshSavedVideosHistory();
});

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

// إضافة علامة مرجعية جديدة بالتواصل الآلي مع الـ Content Script لجلب الوقت الفعلي
async function addNewMarkerHandler() {
    const markerName = prompt("🏷️ اكتب اسماً أو تلميحاً لهذه اللحظة:");
    if (!markerName) return;

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // نطلب الوقت الفعلي الحالي من الـ Content Script للمشغل
    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CURRENT_TIME" }, (response) => {
        const timeInSeconds = response ? response.time : 0;
        const formattedTime = formatSecondsToTime(timeInSeconds);

        chrome.storage.local.get([currentVideoId], (result) => {
            let videoData = result[currentVideoId] || { title: activeTab.title, markers: [] };
            videoData.markers.push({ id: generateUniqueId(), name: markerName, time: timeInSeconds, formatted: formattedTime });

            // التخزين التلقائي المباشر (Auto-Save)
            chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
                appendMarkerToUi(markerName, formattedTime, timeInSeconds);
                refreshSavedVideosHistory();
            });
        });
    });
}

function appendMarkerToUi(name, formattedTime, rawSeconds) {
    const list = document.getElementById('markersList');
    const li = document.createElement('li');
    li.innerHTML = `<span>📌 ${name}</span> <span class="badge">⏱️ ${formattedTime}</span>`;

    li.addEventListener('click', async () => {
        alert(`💡 علامة: "${name}" عند التوقيت [ ${formattedTime} ]`);
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", time: rawSeconds });
    });
    list.appendChild(li);
}

function loadCurrentMarkersFromStorage() {
    const list = document.getElementById('markersList');
    list.innerHTML = '';
    chrome.storage.local.get([currentVideoId], (result) => {
        if (result[currentVideoId] && result[currentVideoId].markers) {
            result[currentVideoId].markers.forEach(m => {
                appendMarkerToUi(m.name, m.formatted, m.time);
            });
        }
    });
}

// 1. التصفية الفورية للعلامات داخل الفيديو الحالي
function searchCurrentMarkers(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#markersList li');
    let matches = false;
    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) { item.style.display = 'flex'; matches = true; }
        else item.style.display = 'none';
    });
    document.getElementById('noMarkers').style.display = (!matches && query !== '') ? 'block' : 'none';
}

// 2. محرك البحث الذكي لتبويب الفيديوهات المحفوظة (حتى لا يتوه المستخدم)
function searchVideoHistoryHandler(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#allVideosList li');
    let matches = false;
    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) { item.style.display = 'flex'; matches = true; }
        else item.style.display = 'none';
    });
    document.getElementById('noVideos').style.display = (!matches && query !== '') ? 'block' : 'none';
}

function refreshSavedVideosHistory() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';
    chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items).filter(k => k !== "extension_initialized");
        if (keys.length === 0) { document.getElementById('noVideos').classList.remove('hidden'); return; }
        document.getElementById('noVideos').classList.add('hidden');
        keys.forEach(key => {
            if (items[key] && items[key].title) {
                const li = document.createElement('li');
                li.innerHTML = `<span>🎬 ${items[key].title}</span> <span class="badge" style="background:#e8f5e9; color:#2e7d32;">${items[key].markers.length} علامات</span>`;
                li.addEventListener('click', () => { chrome.tabs.create({ url: `https://youtube.com{key}` }); });
                historyList.appendChild(li);
            }
        });
    });
}

// إدارة التكرار الذكي (A-B Loop)
async function startVideoLoop() {
    const from = document.getElementById('loopFrom').value;
    const to = document.getElementById('loopTo').value;
    const count = document.getElementById('loopCount').value;
    if (!from || !to) return alert("⚠️ الرجاء كتابة وقت البداية والنهاية!");
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count });
    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
}

async function stopVideoLoop() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" });
    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}

function exportStorageToJson() {
    chrome.storage.local.get(null, (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "My_YT_Bookmarks_Backup.json";
        a.click();
    });
}

function importStorageFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            chrome.storage.local.set(parsed, () => {
                alert('✨ تم استيراد ودمج كافة الفيديوهات المحفوظة بنجاح تامة!');
                loadCurrentMarkersFromStorage();
                refreshSavedVideosHistory();
            });
        } catch (err) { alert('❌ ملف غير صالح.'); }
    };
    reader.readAsText(file);
}
