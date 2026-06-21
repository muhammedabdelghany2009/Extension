let currentVideoId = "default_video";
let currentVideoTitle = "فيديو يوتيوب نشط";
let temporarySeconds = 0;
let temporaryFormattedTime = "00:00";

// ============================================
// تحميل الصفحة وإعداد المستمعات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // تفعيل مستمعات الأزرار
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

    // 🎯 الاستماع لإشارة الدبوس السفلي
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "TRIGGER_POPUP_ADD") {
            askAndAddNewMarker();
        }
    });
});

// ============================================
// فحص الفيديو الحالي
// ============================================
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

    currentVideoId = btoa(unescape(encodeURIComponent(currentVideoTitle))).substring(0, 15);
    loadCurrentVideoMarkersFromStorage();
}

// ============================================
// التنقل بين التبويبات
// ============================================
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

// ============================================
// فتح نافذة الإضافة السريعة
// ============================================
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
        inputField.focus();

        document.getElementById('saveCustomMarkerBtn').onclick = saveCustomMarkerFromInlineForm;
        document.getElementById('cancelCustomMarkerBtn').onclick = () => quickAddContainer.classList.add('hidden');

        inputField.onkeydown = (e) => {
            if (e.key === 'Enter') saveCustomMarkerFromInlineForm();
        };
    });
}

// ============================================
// حفظ العلامة الجديدة
// ============================================
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
            seconds: temporarySeconds,
            createdAt: new Date().toISOString()
        });

        chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            document.getElementById('quickAddContainer').classList.add('hidden');
            showToast('✅ تم حفظ العلامة بنجاح!');
        });
    });
}

// ============================================
// تحميل وعرض علامات الفيديو الحالي (مع أزرار تعديل وحذف)
// ============================================
function loadCurrentVideoMarkersFromStorage() {
    const list = document.getElementById('markersList');
    list.innerHTML = '';

    chrome.storage.local.get([currentVideoId], (result) => {
        const videoData = result[currentVideoId];
        if (!videoData || !videoData.markers || videoData.markers.length === 0) {
            list.innerHTML = '<div class="status-empty-msg">📭 اضغط على الزر في الأعلى لحفظ أول علامة مرجعية هنا!</div>';
            return;
        }

        // ترتيب العلامات حسب الوقت
        const sortedMarkers = [...videoData.markers].sort((a, b) => a.seconds - b.seconds);

        sortedMarkers.forEach((marker, index) => {
            const li = document.createElement('li');
            li.className = 'marker-item';
            li.dataset.markerId = marker.id;
            li.dataset.index = index;

            // تصميم كل علامة مع أزرار التحكم
            li.innerHTML = `
                <div class="marker-content" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:10px;">
                    <div class="marker-info" style="flex:1; cursor:pointer;" title="اضغط للانتقال إلى التوقيت">
                        <span class="marker-title" style="font-weight:500; font-size:13px;">📌 ${marker.title}</span>
                        <span class="badge" style="background:#e8f5e9; color:#2e7d32; font-size:11px; margin-right:8px;">⏱️ ${marker.time}</span>
                    </div>
                    <div class="marker-actions" style="display:flex; gap:5px; flex-shrink:0;">
                        <button class="edit-marker-btn" style="background:#fbbf24; border:none; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:12px;" title="تعديل الوصف">✏️</button>
                        <button class="delete-marker-btn" style="background:#ef4444; border:none; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:12px; color:white;" title="حذف العلامة">🗑️</button>
                    </div>
                </div>
            `;

            // 🎯 الانتقال إلى التوقيت عند الضغط على المحتوى
            li.querySelector('.marker-info').addEventListener('click', async () => {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.sendMessage(activeTab.id, { action: "SEEK_TO", seconds: marker.seconds });
            });

            // ✏️ تعديل العلامة
            li.querySelector('.edit-marker-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                showEditMarkerDialog(marker.id, marker.title);
            });

            // 🗑️ حذف العلامة
            li.querySelector('.delete-marker-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteMarker(marker.id);
            });

            list.appendChild(li);
        });
    });
}

// ============================================
// ✏️ نافذة تعديل العلامة
// ============================================
function showEditMarkerDialog(markerId, currentTitle) {
    // إزالة أي نافذة موجودة
    const existingDialog = document.querySelector('.edit-dialog-overlay');
    if (existingDialog) existingDialog.remove();

    // إنشاء النافذة
    const overlay = document.createElement('div');
    overlay.className = 'edit-dialog-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 25px 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        direction: rtl;
        text-align: right;
    `;

    dialog.innerHTML = `
        <h3 style="margin:0 0 10px 0; color:#1a1a1a; font-size:18px;">✏️ تعديل العلامة</h3>
        <p style="color:#666; font-size:13px; margin-bottom:15px;">قم بتعديل وصف العلامة المرجعية</p>
        <input type="text" id="editMarkerInput" value="${currentTitle}" style="
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 15px;
            font-family: inherit;
        ">
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="editCancelBtn" style="
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                background: #f0f0f0;
                color: #333;
                cursor: pointer;
                font-weight: 600;
            ">إلغاء</button>
            <button id="editSaveBtn" style="
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                background: #3b82f6;
                color: white;
                cursor: pointer;
                font-weight: 600;
            ">💾 حفظ التعديل</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // التركيز على حقل الإدخال
    setTimeout(() => {
        const input = document.getElementById('editMarkerInput');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);

    // مستمعات الأزرار
    document.getElementById('editCancelBtn').addEventListener('click', () => {
        overlay.remove();
    });

    document.getElementById('editSaveBtn').addEventListener('click', () => {
        const newTitle = document.getElementById('editMarkerInput').value.trim();
        if (!newTitle) {
            alert('الرجاء إدخال وصف صحيح!');
            return;
        }
        updateMarkerTitle(markerId, newTitle);
        overlay.remove();
    });

    // Enter للحفظ
    document.getElementById('editMarkerInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('editSaveBtn').click();
        }
    });

    // إغلاق عند الضغط خارج النافذة
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ============================================
// تحديث عنوان العلامة
// ============================================
function updateMarkerTitle(markerId, newTitle) {
    chrome.storage.local.get([currentVideoId], (result) => {
        let videoData = result[currentVideoId];
        if (!videoData) return;

        const markerIndex = videoData.markers.findIndex(m => m.id === markerId);
        if (markerIndex === -1) return;

        videoData.markers[markerIndex].title = newTitle;

        chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
            loadCurrentVideoMarkersFromStorage();
            refreshAllVideosHistoryList();
            showToast('✅ تم تحديث الوصف بنجاح!');
        });
    });
}

// ============================================
// 🗑️ حذف العلامة مع تأكيد
// ============================================
function deleteMarker(markerId) {
    // نافذة تأكيد الحذف
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه العلامة؟')) return;

    chrome.storage.local.get([currentVideoId], (result) => {
        let videoData = result[currentVideoId];
        if (!videoData) return;

        // تصفية العلامات مع استبعاد المطلوب حذفه
        const updatedMarkers = videoData.markers.filter(m => m.id !== markerId);

        if (updatedMarkers.length === 0) {
            // إذا لم يتبقى علامات، نحذف الفيديو بالكامل من التخزين
            chrome.storage.local.remove([currentVideoId], () => {
                loadCurrentVideoMarkersFromStorage();
                refreshAllVideosHistoryList();
                showToast('🗑️ تم حذف العلامة بنجاح!');
            });
        } else {
            videoData.markers = updatedMarkers;
            chrome.storage.local.set({ [currentVideoId]: videoData }, () => {
                loadCurrentVideoMarkersFromStorage();
                refreshAllVideosHistoryList();
                showToast('🗑️ تم حذف العلامة بنجاح!');
            });
        }
    });
}

// ============================================
// 🍞 إشعارات (Toast)
// ============================================
function showToast(message) {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a1a;
        color: white;
        padding: 12px 28px;
        border-radius: 10px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        direction: rtl;
        text-align: center;
        max-width: 90%;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============================================
// عرض تاريخ الفيديوهات المحفوظة
// ============================================
function refreshAllVideosHistoryList() {
    const historyList = document.getElementById('allVideosList');
    historyList.innerHTML = '';

    chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items).filter(k => k !== "extension_initialized");
        if (keys.length === 0) {
            historyList.innerHTML = '<div class="status-empty-msg">📭 لم يتم العثور على فيديوهات محفوظة.</div>';
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
                    } else {
                        subList.classList.add('hidden');
                    }
                });
                historyList.appendChild(li);
            }
        });
    });
}

// ============================================
// البحث والفلترة
// ============================================
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
        item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none';
    });
}

// ============================================
// تصدير واستيراد البيانات
// ============================================
function exportStorageToJson() {
    chrome.storage.local.get(null, (data) => {
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", jsonString);
        a.setAttribute("download", "YT_Bookmarks_Database.json");
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('📤 تم تصدير البيانات بنجاح!');
    });
}

function importStorageFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = JSON.parse(evt.target.result);
            chrome.storage.local.set(data, () => {
                executeDirectDynamicCheck();
                refreshAllVideosHistoryList();
                showToast('📥 تم استيراد البيانات بنجاح!');
            });
        } catch (err) {
            alert('❌ الملف غير صالح. تأكد من أنه ملف JSON صحيح.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // إعادة تعيين الإدخال
}

// ============================================
// ميزة التكرار (Loop)
// ============================================
async function startLoopSequence() {
    const from = document.getElementById('loopFrom').value;
    const to = document.getElementById('loopTo').value;
    const count = document.getElementById('loopCount').value;

    if (!from || !to) {
        alert("⚠️ فضلاً أدخل نطاق الوقت!");
        return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "START_LOOP", from, to, count });
    document.getElementById('startLoopBtn').classList.add('hidden');
    document.getElementById('stopLoopBtn').classList.remove('hidden');
    showToast('🔄 بدء التكرار...');
}

async function stopLoopSequence() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(activeTab.id, { action: "STOP_LOOP" });
    document.getElementById('startLoopBtn').classList.remove('hidden');
    document.getElementById('stopLoopBtn').classList.add('hidden');
    showToast('⏹️ تم إيقاف التكرار');
}

// ============================================
// دوال مساعدة
// ============================================
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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

// ============================================
// إضافة CSS للـ Animations
// ============================================
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .marker-item {
        transition: all 0.15s ease;
    }
    .marker-item:hover {
        background: #f1f5f9 !important;
    }
`;
document.head.appendChild(styleSheet);

console.log('✅ YouTube Bookmarks Popup - تم التحميل بنجاح!');