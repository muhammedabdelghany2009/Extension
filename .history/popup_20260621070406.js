let currentVideoId = "default_video";
let currentVideoTitle = "فيديو يوتيوب نشط";
let temporarySeconds = 0;
let temporaryFormattedTime = "00:00";

document.addEventListener('DOMContentLoaded', async () => {
    // تفعيل كافة أزرار الإضافة فوراً لتجنب أي تأخير
    document.getElementById('addBookmarkBtn').addEventListener('click', askAndAddNewMarker);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentVideoMarkers);
    document.getElementById('searchSavedVideos').addEventListener('input', searchInSavedVideosHistory);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startLoopSequence);
    document.getElementById('stopLoopBtn').addEventListener('click', stopLoopSequence);

    setupTabsNavigation();
    refreshAllVideosHistoryList();

    // تشغيل الفحص المباشر والحاسم المبني على اسم التبويب
    executeDirectDynamicCheck();
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

    // 1. لو خارج موقع يوتيوب بالكامل -> رسالة التحويل العادية
    if (pageUrl !== "" && !pageUrl.includes("youtube.com") && !pageUrl.includes("youtu.be")) {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');

        errorTitle.textContent = "عذرًا، أنت لست داخل يوتيوب!";
        errorText.textContent = "هذه الإضافة مخصصة لمنصة يوتيوب لمساعدتك على المذاكرة وحفظ لقطات الفيديو. اضغط بالأسفل للانتقال للموقع.";
        errorBtn.classList.remove('hidden');
        errorBtn.textContent = "الانتقال إلى منصة يوتيوب 🚀";
        errorBtn.href = "https://youtube.com";
        errorBtn.setAttribute('target', '_blank');
        errorBtn.onclick = null;
        return;
    }

    // 2. لو في أي مكان داخل يوتيوب وليس داخل فيديو شغال (صفحة رئيسية أو بحث) -> يظهر طلبك الصافي والمحدد تماماً
    const isMainOrSearchPage = pageTitle === "YouTube" ||
        pageTitle.includes("الصفحة الرئيسية") ||
        pageTitle.includes("Search") ||
        pageTitle.includes("بحث") ||
        (!pageUrl.includes("watch") && !pageUrl.includes("shorts") && !pageUrl.includes("youtu.be"));

    if (isMainOrSearchPage) {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');

        errorTitle.textContent = "من فضلك حدد فيديو فقط 📺";
        errorText.textContent = "";
        errorBtn.classList.add('hidden'); // إخفاء الأزرار الزائدة
        return;
    }

    // 3. مستخدم داخل فيديو حقيقي -> تفتح الواجهة فوراً
    errorScreen.classList.add('hidden');
    mainContent.classList.remove('hidden');

    currentVideoTitle = pageTitle;
    document.getElementById('videoTitle').textContent = currentVideoTitle;

    // إنشاء معرف فريد وثابت لحفظ وجلب علامات الفيديو الحالي
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

// دالة تفعيل كارت الإدخال التفاعلي الأنيق في واجهة الإضافة بدلاً من prompt المتصفح
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
        inputField.focus(); // توجيه التركيز للكتابة فوراً

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

        videoData.markers.push({
            id: generateUniqueId(),
            title: markerTitle,
            time: temporaryFormattedTime,
            seconds: temporarySeconds
        });

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
                    chrome.tabs.create({ url: `https://youtube.com/search?q=${encodeURIComponent(videoData.title)}` });
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
                executeDirectDynamicCheck();
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
    if (!from || !to) return alert("فضلاً أدخل نطاق الوقت!"); const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count }); document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
} async function stopLoopSequence() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" }); document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}