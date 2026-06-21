document.addEventListener('DOMContentLoaded', async () => {
    // تفعيل التنقل بين التبويبات (Tabs)
    setupTabs();

    // ميزة 1: البحث وتصفية العلامات الحالية
    const searchInput = document.getElementById('searchMarker');
    searchInput.addEventListener('input', filterMarkers);

    // ميزة 2: الاستيراد والتصدير بصيغة JSON المنظمة
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);

    // ميزة 3: إرسال أوامر تكرار اللقطة (Loop) إلى الـ Content Script
    document.getElementById('startLoopBtn').addEventListener('click', startVideoLoop);
    document.getElementById('stopLoopBtn').addEventListener('click', stopVideoLoop);

    // ميزة 4: جلب الفيديوهات المضافة مسبقاً وعرضها في السجل
    loadAllSavedVideos();

    // لغرض التجربة المحاكية: جلب بيانات الفيديو الحالي (استبدلها بمنطق التخزين لديك)
    loadCurrentVideoMarkers();
});

// التنقل بين الـ Tabs
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

// 1. منطق البحث والفلترة الفورية
function filterMarkers(e) {
    const query = e.target.value.toLowerCase().trim();
    const markers = document.querySelectorAll('#markersList li');
    let hasMatches = false;

    markers.forEach(marker => {
        const text = marker.textContent.toLowerCase();
        if (text.includes(query)) {
            marker.classList.remove('hidden');
            hasMatches = true;
        } else {
            marker.classList.add('hidden');
        }
    });

    const noMarkersMsg = document.getElementById('noMarkers');
    if (!hasMatches && query !== '') noMarkersMsg.classList.remove('hidden');
    else noMarkersMsg.classList.add('hidden');
}

// 2. تصدير البيانات بصيغة JSON مرتبة بأسماء الفيديوهات
function exportData() {
    chrome.storage.local.get(null, (items) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "video_markers_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
}

// 2. استيراد الملف وإعادة تخزينه بالتنظيم الصحيح
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const parsedData = JSON.parse(event.target.result);
            chrome.storage.local.set(parsedData, () => {
                alert('تم استيراد كافة الفيديوهات وعلاماتها المرجعية بنجاح بنظامها الأصلي!');
                loadAllSavedVideos();
                loadCurrentVideoMarkers();
            });
        } catch (err) {
            alert('خطأ: الملف المرفوع ليس بصيغة JSON صحيحة.');
        }
    };
    reader.readAsText(file);
}

// 3. منطق إرسال فترات التكرار للـ Content Script
async function startVideoLoop() {
    const fromTime = document.getElementById('loopFrom').value;
    const toTime = document.getElementById('loopTo').value;
    const loopCount = document.getElementById('loopCount').value;

    if (!fromTime || !toTime) return alert("يرجى تحديد وقت البداية والنهاية أولاً!");

    // إرسال البيانات للتبويب النشط ليقوم الـ Content script ببرمجتها على مشغل الفيديو
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
        action: "START_LOOP",
        from: convertToSeconds(fromTime),
        to: convertToSeconds(toTime),
        count: loopCount
    });

    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
}

async function stopVideoLoop() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "STOP_LOOP" });

    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}

// 4. جلب وعرض قائمة كافة الفيديوهات التي تمتلك علامات (لوحة التحكم)
function loadAllSavedVideos() {
    const allVideosList = document.getElementById('allVideosList');
    allVideosList.innerHTML = '';

    chrome.storage.local.get(null, (items) => {
        const videoKeys = Object.keys(items);

        if (videoKeys.length === 0) {
            document.getElementById('noVideos').classList.remove('hidden');
            return;
        }

        document.getElementById('noVideos').classList.add('hidden');
        videoKeys.forEach(videoUrl => {
            const videoData = items[videoUrl];
            // نتحقق أن العنصر يحتوي على اسم فيديو وعلامات فعلاً
            if (videoData && videoData.title && videoData.markers) {
                const li = document.createElement('li');
                li.textContent = videoData.title;
                li.title = "انقر لفتح الفيديو";
                li.addEventListener('click', () => {
                    chrome.tabs.create({ url: videoUrl });
                });
                allVideosList.appendChild(li);
            }
        });
    });
}

// دالة تجريبية مساعدة لعرض العلامات الحالية
function loadCurrentVideoMarkers() {
    const list = document.getElementById('markersList');
    list.innerHTML = '<li>علامة تجريبية: دقيقة 02:15 <span>⏱️</span></li>';
}

// تحويل صيغة الوقت (01:30 أو الدقائق) إلى ثوانٍ مجردة
function convertToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 3) return (parts[0] * 3600) + parts[1] * 60 + parts[2];
    return parts[0] || 0;
}
