document.addEventListener('DOMContentLoaded', async () => {
    setupTabsNavigation();

    // ميزة إضافة علامة برمز وشكل تفاعلي
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    addBookmarkBtn.addEventListener('click', onAddBookmarkClicked);

    // ميزة التصفية والبحث الفوري
    const searchInput = document.getElementById('searchMarker');
    searchInput.addEventListener('input', executeMarkerSearch);

    // ميزات الاستيراد والتصدير الراقية (JSON)
    document.getElementById('exportBtn').addEventListener('click', exportDatabaseToJson);
    document.getElementById('importFile').addEventListener('change', importDatabaseFromJson);

    // التحكم في فترات التكرار (A-B Loop)
    document.getElementById('startLoopBtn').addEventListener('click', triggerVideoLoopStart);
    document.getElementById('stopLoopBtn').addEventListener('click', triggerVideoLoopStop);

    // تحميل البيانات المبدئية للعرض وتجربة الواجهة الجمالية
    refreshSavedVideosHistory();
    renderDemoMarkers();
});

// التنقل المرن بين التبويبات
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

// عند الضغط على الزر الفاخر لإضافة علامة
function onAddBookmarkClicked() {
    const nameInput = prompt("🏷️ اكتب اسماً أو تلميحاً لهذه اللحظة في الفيديو:");
    if (!nameInput) return;

    const simulatedTime = "04:20"; // توقيت تجريبي
    createAndInjectMarkerElement(nameInput, simulatedTime);
}

// دالة بناء العناصر داخل الواجهة مع تفعيل ميزة "معرفة اسم التوقيت عند النقر"
function createAndInjectMarkerElement(markerName, timestamp) {
    const listContainer = document.getElementById('markersList');
    const li = document.createElement('li');

    li.innerHTML = `
    <span style="font-weight: 600;">📌 ${markerName}</span>
    <span class="badge">⏱️ ${timestamp}</span>
  `;

    // الحدث التفاعلي: يخبرك باسم العلامة الفعلي عند النقر عليه بنوافذ عصرية
    li.addEventListener('click', () => {
        alert(`💡 علامة محفوظة:\nالعنوان: "${markerName}"\nالتوقيت المستهدف: ${timestamp}`);
    });

    listContainer.appendChild(li);
}

// تصفية العلامات بشكل ديناميكي فوري أثناء الكتابة
function executeMarkerSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const allListItems = document.querySelectorAll('#markersList li');
    let matchFound = false;

    allListItems.forEach(item => {
        if (item.textContent.toLowerCase().includes(searchTerm)) {
            item.style.display = 'flex';
            matchFound = true;
        } else {
            item.style.display = 'none';
        }
    });

    const emptyMsg = document.getElementById('noMarkers');
    if (!matchFound && searchTerm !== '') emptyMsg.classList.remove('hidden');
    else emptyMsg.classList.add('hidden');
}

// تصدير البيانات المرتبة بأسماء الفيديوهات
function exportDatabaseToJson() {
    chrome.storage.local.get(null, (allSavedData) => {
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSavedData, null, 2));
        const dlLink = document.createElement('a');
        dlLink.setAttribute("href", jsonString);
        dlLink.setAttribute("download", "Premium_Video_Bookmarks.json");
        document.body.appendChild(dlLink);
        dlLink.click();
        dlLink.remove();
    });
}

// استيراد قاعدة البيانات الاحترافية دون فقد التنظيم
function importDatabaseFromJson(e) {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        try {
            const parsedContent = JSON.parse(event.target.result);
            chrome.storage.local.set(parsedContent, () => {
                alert('✨ تم استيراد الملف وقاعدة بياناتك بنجاح تام وبشكل منظم!');
                refreshSavedVideosHistory();
            });
        } catch (err) {
            alert('❌ فشل في الاستيراد: يرجى التأكد من اختيار ملف JSON صحيح.');
        }
    };
    fileReader.readAsText(uploadedFile);
}

// بدء التكرار وإرسال الإشارة للـ Content Script
async function triggerVideoLoopStart() {
    const fromValue = document.getElementById('loopFrom').value;
    const toValue = document.getElementById('loopTo').value;
    const selectedLoopCount = document.getElementById('loopCount').value;

    if (!fromValue || !toValue) return alert("⚠️ فضلاً، أدخل حقول التوقيت أولاً!");

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, {
        action: "START_LOOP",
        from: fromValue,
        to: toValue,
        count: selectedLoopCount
    });

    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
}

function triggerVideoLoopStop() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
        chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" });
    });
    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
}

// جلب لوحة الفيديوهات المحفوظة مسبقاً (ميزة 4)
function refreshSavedVideosHistory() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';

    chrome.storage.local.get(null, (storedItems) => {
        const urls = Object.keys(storedItems);
        if (urls.length === 0) {
            document.getElementById('noVideos').classList.remove('hidden');
            return;
        }
        document.getElementById('noVideos').classList.add('hidden');
        urls.forEach(urlKey => {
            const data = storedItems[urlKey];
            if (data && data.title) {
                const li = document.createElement('li');
                li.innerHTML = `<span>🎬 ${data.title}</span> <span class="badge" style="background:#e8f5e9; color:#2e7d32;">جاهز</span>`;
                li.addEventListener('click', () => { chrome.tabs.create({ url: urlKey }); });
                historyList.appendChild(li);
            }
        });
    });
}
