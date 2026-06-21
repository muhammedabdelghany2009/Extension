import { getActiveTabURL } from "./utils.js";

const addNewBookmark = (bookmarks, bookmark) => {
    const bookmarkTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");

    bookmarkTitleElement.textContent = bookmark.desc;
    bookmarkTitleElement.className = "bookmark-title";
    controlsElement.className = "bookmark-controls";

    setBookmarkAttributes("play", onPlay, controlsElement);
    setBookmarkAttributes("delete", onDelete, controlsElement);

    newBookmarkElement.id = "bookmark-" + bookmark.time;
    newBookmarkElement.className = "bookmark";
    newBookmarkElement.setAttribute("timestamp", bookmark.time);

    newBookmarkElement.appendChild(bookmarkTitleElement);
    newBookmarkElement.appendChild(controlsElement);
    bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
    const bookmarksElement = document.getElementById("bookmarks");
    bookmarksElement.innerHTML = "";

    if (currentBookmarks.length > 0) {
        for (let i = 0; i < currentBookmarks.length; i++) {
            const bookmark = currentBookmarks[i];
            addNewBookmark(bookmarksElement, bookmark);
        }
    } else {
        bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
    }
};

const onPlay = async e => {
    const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
    const activeTab = await getActiveTabURL();

    chrome.tabs.sendMessage(activeTab.id, {
        type: "PLAY",
        value: bookmarkTime,
    });
};

const onDelete = async e => {
    const activeTab = await getActiveTabURL();

    const urlParameters = new URLSearchParams(new URL(activeTab.url).search);


    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

    chrome.tabs.sendMessage(activeTab.id, {
        type: "DELETE",
        value: bookmarkTime,
    }, (updatedBookmarks) => {
        const searchInput = document.getElementById("search-input");
        searchInput.value = "";
        viewBookmarks(updatedBookmarks);
    });
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
    const controlElement = document.createElement("img");

    controlElement.src = "assets/" + src + ".png";
    controlElement.title = src;
    controlElement.addEventListener("click", eventListener);
    controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
    const activeTab = await getActiveTabURL();
    const queryParameters = activeTab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);
    const currentVideo = urlParameters.get("v");

    if (activeTab.url.includes("://youtube.com") && currentVideo) {
        chrome.storage.sync.get([currentVideo], (data) => {
            let currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];

            viewBookmarks(currentVideoBookmarks);

            const searchInput = document.getElementById("search-input");
            searchInput.addEventListener("input", (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = currentVideoBookmarks.filter(b =>
                    b.desc.toLowerCase().includes(query)
                );
                viewBookmarks(filtered);
            });

            document.getElementById("export-btn").addEventListener("click", () => {
                chrome.storage.sync.get(null, (allData) => {
                    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "youtube-bookmarks-backup.json";
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });

            document.getElementById("import-btn").addEventListener("click", () => {
                document.getElementById("import-file-input").click();
            });

            document.getElementById("import-file-input").addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const parsedData = JSON.parse(event.target.result);
                        chrome.storage.sync.set(parsedData, () => {
                            alert("تم استيراد العلامات المرجعية بنجاح!");
                            chrome.storage.sync.get([currentVideo], (newData) => {
                                currentVideoBookmarks = newData[currentVideo] ? JSON.parse(newData[currentVideo]) : [];
                                searchInput.value = "";
                                viewBookmarks(currentVideoBookmarks);
                            });
                        });
                    } catch (err) {
                        alert("فشل الاستيراد: تأكد من صحة ملف الـ JSON المرفوع.");
                    }
                };
                reader.readAsText(file);
            });

        });
    } else {
        const container = document.getElementsByClassName("container")[0];
        container.innerHTML = '<div class="title">This is not a youtube video page.</div>';
    }
});
