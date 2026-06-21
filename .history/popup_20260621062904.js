let currentVideoId = "";
let currentVideoTitle = "";
let currentFullUrl = "";

document.addEventListener('DOMContentLoaded', async () => {
    const currentTab = await getActiveTabURL();
    const errorScreen = document.getElementById('errorScreen');
    const mainContent = document.getElementById('mainContent');

    // تخزين الرابط بالكامل لاستخدامه في زر التحويل الذكي
    if (currentTab && currentTab.url) {
        currentFullUrl = currentTab.url;
    }

    // الوعي الذكي بالصفحة والفيديو
    if (currentTab && currentTab.url && currentTab.url.includes("://youtube.com")) {
        errorScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');

        currentVideoTitle = currentTab.title || "فيديو يوتيوب نشط";
        document.getElementById('videoTitle').textContent = currentVideoTitle;

        const urlParams = new URLSearchParams(new URL(currentTab.url).search);
        currentVideoId = urlParams.get("v");
    } else {
        // تعديل منطق زر رسالة الخطأ الذكي ليصبح ديناميكياً
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');

        const errorBtn = errorScreen.querySelector('.btn-gradient');
        if (currentFullUrl && currentFullUrl.includes("youtube.com")) {
            // لو المستخدم في يوتيوب بس مش جوه فيديو (زي الصفحة الرئيسية)
            errorBtn.textContent = "فتح فيديو عشوائي للمذاكرة 🎬";
            errorBtn.href = "https://youtube.com";
        } else {
            // لو خارج يوتيوب تماماً
            errorBtn.textContent = "الانتقال إلى منصة يوتيوب 🚀";
            errorBtn.href = "https://youtube.com";
        }
        return;
    }

    // تفعيل مستمعات الأحداث
    document.getElementById('addBookmarkBtn').addEventListener('click', askAndAddNewMarker);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentVideoMarkers);
    document.getElementById('searchSavedVideos').addEventListener('input', searchInSavedVideosHistory);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startLoopSequence);
    document.getElementById('stopLoopBtn').addEventListener('click', stopLoopSequence);

    setupTabsNavigation();
    loadCurrentVideoMarkersFromStorage();
    refreshAllVideosHistoryList();
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

// طلب الوقت الحالي الفعلي وتنبيه المستخدم بالوقت فوراً مع طلب الوصف
async function askAndAddNewMarker() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CURRENT_TIME" }, (response) => {
        const rawSeconds = response && response.time ? response.time : 0;
        const formattedTime = formatSecondsToTime(rawSeconds);

        // الطلب الجديد: أول ما يضغط يظهر له الوقت ويطلب الوصف
        const markerTitle = prompt(`⏱️ التوقيت الحالي للفيديو هو (${formattedTime})\n\nفضلاً اكتب وصفاً أو اسماً لهذه العلامة المرجعية لطلب حفظها:`);
        if (!markerTitle) return;

        chrome.storage.local.get([currentVideoId], (result) => {
            let videoData = result[currentVideoId] || { title: currentVideoTitle, markers: [] };

            videoData.markers.push({
                id: generateUniqueId(),
                title: markerTitle,
                time: formattedTime,
                seconds: rawSeconds
            });

            chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
                loadCurrentVideoMarkersFromStorage();
                refreshAllVideosHistoryList();
            });
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
                // عند الضغط على العلامة ينتقل مشغل الفيديو فوراً للتوقيت المطلوب ويشغله دون الخروج
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", seconds: marker.seconds });
            });
            list.appendChild(li);
        });
    });
}

function searchCurrentVideoMarkers(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#markersList li');
    let found = false;

    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) {
            item.style.display = 'flex'; found = true;
        } else { item.style.display = 'none'; }
    });
    document.getElementById('noMarkers').style.display = (!found && query !== '') ? 'block' : 'none';
}

function searchInSavedVideosHistory(e) {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#allVideosList li');
    let found = false;

    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) {
            item.style.display = 'flex'; found = true;
        } else { item.style.display = 'none'; }
    });
    document.getElementById('noVideos').style.display = (!found && query !== '') ? 'block' : 'none';
}

function refreshAllVideosHistoryList() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';

    chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items).filter(k => k !== "extension_initialized");
        if (keys.length === 0) {
            historyList.innerHTML = '<div class="status-empty-msg">لم يتم العثور على فيديوهات محفوظة مسبقًا.</div>';
            return;
        }

        keys.forEach(key => {
            const videoData = items[key];
            if (videoData && videoData.title) {
                const li = document.createElement('li');
                li.innerHTML = `<span>🎬 ${videoData.title}</span> <span class="badge" style="background:#e8f5e9; color:#2e7d32;">${videoData.markers.length} علامات</span>`;
                li.addEventListener('click', () => {
                    chrome.tabs.create({ url: `https://www.://youtube.com?v=${key}` });
                });
                historyList.appendChild(li);
            }
        });
    });
}

function exportStorageToJson() {
    chrome.storage.local.get(null, (data) => {
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", jsonString);
        a.setAttribute("download", "YT_Bookmarks_Database.json");
        document.body.appendChild(a); a.click(); a.remove();
    });
}

function importStorageFromJson(e) {
    const file = e.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            chrome.storage.local.set(parsed, () => {
                alert('✨ تم استيراد ودمج كافة البيانات المحفوظة بنجاح!');
                loadCurrentVideoMarkersFromStorage();
                refreshAllVideosHistoryList();
            });
        } catch (err) { alert('الملف المختار غير صالح.'); }
    };
    reader.readAsText(file);
}

async function startLoopSequence() {
    const from = document.getElementById('loopFrom').value;
    const to = document.getElementById('loopTo').value;
    const count = document.getElementById('loopCount').value;
    if (!from || !to) return alert("فضلاً أدخل نطاق الوقت!");

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count });
    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
}

async function stopLoopSequence() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" });
    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}
