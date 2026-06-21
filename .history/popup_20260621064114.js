let currentVideoId = "";
let currentVideoTitle = "";

document.addEventListener('DOMContentLoaded', async () => {
    // تفعيل أزرار الواجهة فوراً دون أي تأخير
    document.getElementById('addBookmarkBtn').addEventListener('click', askAndAddNewMarker);
    document.getElementById('searchMarker').addEventListener('input', searchCurrentVideoMarkers);
    document.getElementById('searchSavedVideos').addEventListener('input', searchInSavedVideosHistory);
    document.getElementById('exportBtn').addEventListener('click', exportStorageToJson);
    document.getElementById('importFile').addEventListener('change', importStorageFromJson);
    document.getElementById('startLoopBtn').addEventListener('click', startLoopSequence);
    document.getElementById('stopLoopBtn').addEventListener('click', stopLoopSequence);

    setupTabsNavigation();
    refreshAllVideosHistoryList();

    // الفحص المباشر والحاسم للرابط
    executeDefinitiveUrlCheck();
});

async function executeDefinitiveUrlCheck() {
    const errorScreen = document.getElementById('errorScreen');
    const mainContent = document.getElementById('mainContent');
    const errorBtn = errorScreen.querySelector('.btn-gradient');
    const errorTitle = errorScreen.querySelector('h4');
    const errorText = errorScreen.querySelector('p');

    // جلب التبويب النشط مباشرة وبدون وسيط
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || !tabs[0] || !tabs[0].url) {
        // حالة احتياطية إذا لم يتوفر الرابط فوراً
        mainContent.classList.remove('hidden');
        errorScreen.classList.add('hidden');
        return;
    }

    const urlStr = tabs[0].url;
    currentVideoTitle = tabs[0].title || "فيديو يوتيوب نشط";

    // 1. فحص شامل لكل صيغ الفيديوهات المتوقعة (فيديو عادي، قوائم تشغيل، شورتس، روابط مختصرة)
    const isVideoUrl = urlStr.includes("://youtube.com") ||
        urlStr.includes("youtu.be/") ||
        urlStr.includes("://youtube.com");

    if (isVideoUrl) {
        // استخراج الـ ID بدقة مهما كانت الصيغة معقدة (تحتوي على &list أو &t)
        try {
            if (urlStr.includes("://youtube.com")) {
                currentVideoId = urlStr.split("/shorts/")[1].split("?")[0];
            } else if (urlStr.includes("youtu.be/")) {
                currentVideoId = urlStr.split("/").pop().split("?")[0];
            } else {
                const urlObj = new URL(urlStr);
                currentVideoId = urlObj.searchParams.get("v");
            }
        } catch (e) {
            currentVideoId = "custom_yt_video";
        }

        // إذا تم العثور على صيغة فيديو صحيحة، افتح الواجهة فوراً واقفل شاشة التحذير
        errorScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        document.getElementById('videoTitle').textContent = currentVideoTitle;
        loadCurrentVideoMarkersFromStorage();
    }
    // 2. إذا كان المستخدم داخل موقع يوتيوب ولكن في صفحة رئيسية أو بحث (ليس فيديو)
    else if (urlStr.includes("youtube.com")) {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');

        errorTitle.textContent = "يرجى اختيار فيديو أولاً! 📺";
        errorText.textContent = "من فضلك، اختر الفيديو الذي تريده من القائمة أمامك أو قائمة التشغيل، ثم افتح الإضافة لبدء تسجيل علاماتك.";
        errorBtn.textContent = "تصفح الفيديوهات الآن 🔍";

        errorBtn.href = "#";
        errorBtn.removeAttribute('target');
        errorBtn.onclick = (e) => {
            e.preventDefault();
            window.close(); // يغلق الإضافة ليتصفح يوتيوب براحته
        };
    }
    // 3. إذا كان خارج منصة يوتيوب بالكامل
    else {
        mainContent.classList.add('hidden');
        errorScreen.classList.remove('hidden');

        errorTitle.textContent = "عذرًا، أنت لست داخل يوتيوب!";
        errorText.textContent = "هذه الإضافة مخصصة لمنصة يوتيوب لمساعدتك على المذاكرة وحفظ لقطات الفيديو. اضغط بالأسفل للانتقال للموقع.";
        errorBtn.textContent = "الانتقال إلى منصة يوتيوب 🚀";
        errorBtn.href = "https://youtube.com";
        errorBtn.setAttribute('target', '_blank');
        errorBtn.onclick = null;
    }
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
        const rawSeconds = response && response.time ? response.time : 0;
        const formattedTime = formatSecondsToTime(rawSeconds);

        const markerTitle = prompt(`⏱️ التوقيت الحالي للفيديو هو (${formattedTime})\n\nفضلاً اكتب وصفاً أو اسماً لهذه العلامة المرجعية لحفظها:`);
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
                executeDefinitiveUrlCheck();
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