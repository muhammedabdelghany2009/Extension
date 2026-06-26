# YouTube Bookmarks Pro

A Chrome extension to save bookmarks on YouTube videos and loop a specific scene (A-B Loop).

---

## Name and Description

**Name:** YouTube Bookmarks Pro

**Description:** A simple and easy extension to save bookmarks on YouTube videos with timestamps, jump back to them anytime, and loop a specific scene (A-B Loop).

---

## How to install

Open Chrome, go to settings (three dots on the right), select Extensions, type YouTube Bookmarks Pro in the search, and add the extension.

<img src="assets/screenshots/Screenshot%20(129).png" width="600">

Then make sure to pin it to your toolbar.

<img src="assets/screenshots/Screenshot%20(132).png" width="600">

---

## How to use

After installing, you'll find it next to the YouTube link in the address bar. Click the icon to open the extension.

<img src="assets/screenshots/Screenshot%20(130).png" width="600">

---

## How to add a bookmark

1. In the extension click **Add new bookmark**
2. A card will appear in the middle of the screen
3. The timestamp is set automatically based on where you are in the video
4. Enter a description for the bookmark
5. Click Save

<img src="assets/screenshots/Screenshot%20(154).png" width="600">

---

## Extension features

- Save a new bookmark
- Edit bookmark description
- Delete bookmark
- View all videos with bookmarks
- Search through bookmarks
- Loop a specific scene (A-B Loop)
- Export all data as JSON file
- Import data from JSON file

<img src="assets/screenshots/Screenshot%20(155).png" width="600">

<img src="assets/screenshots/Screenshot%20(156).png" width="600">

There is also a history list where you can find all saved bookmarks organized by channel name and video title.

<img src="assets/screenshots/Screenshot%20(157).png" width="600">

---

## Important notes

- The extension only works on YouTube
- Won't work if you're not on a video (you'll see a warning message)
- You must be on a video to save a bookmark

<img src="assets/screenshots/Screenshot%20(152).png" width="600">

<img src="assets/screenshots/Screenshot%20(153).png" width="600">

---

## For developers

### Project Structure
```
manifest.json
background.js
contentScript.js
popup.html
popup.css
popup.js
utils.js
assets/
```

### How to install manually
1. Clone the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

### Technologies used
- JavaScript
- Chrome Extension API
- HTML & CSS

### Links
https://github.com/muhammedabdelghany2009/Extension

---

## License

MIT

---

## Devlog

### v2.0.0 — Major Update
**What changed:**
- Rewrote the popup UI from scratch with a cleaner two-tab layout (Current Video / Saved)
- Added a full A-B Loop feature — set a start and end time, choose how many times to repeat, and the extension handles it automatically
- Added a live search bar inside both tabs so you can find any bookmark instantly
- Bookmarks now show under the video title in a scrollable list instead of a flat dump
- Added export and import — you can back up all your bookmarks as a JSON file and restore them later
- The quick-add button (📌) now appears directly inside the YouTube player controls so you don't need to open the popup every time
- When you click the quick-add button, the video pauses automatically and a card appears in the center of the screen showing your existing bookmarks for that video

**Why these changes:**
The first version worked but felt rough — the UI was hard to navigate and the loop feature didn't exist yet. This update focused on making the most common action (saving a bookmark) as fast as possible, while adding the loop feature that a lot of people use for studying or reviewing scenes.

---

### v1.0.0 — Initial Release
**What was built:**
- Basic bookmark saving tied to a video ID and timestamp
- List of saved bookmarks in the popup
- Click any bookmark to jump back to that time
- Edit and delete bookmarks


**What I ran into:**
- YouTube's DOM changes a lot depending on the page, so injecting the button into the player controls required a MutationObserver watching for the controls to render before inserting anything
- The video ID extraction from the URL had to handle both standard watch URLs and Shorts URLs separately
- Storage is scoped per video ID so bookmarks for one video never mix with another

