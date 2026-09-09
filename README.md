# 英文練習本（升級版）

單頁英文練習 PWA：iOS 可加入主畫面、AI 翻譯（Groq，免費）、Firebase 跨裝置同步、發音、跟讀評分、詞彙庫、間隔重複複習。

## 檔案說明

```
index.html                     主程式（Tailwind + JS，單一頁面）
manifest.json                  PWA 設定（給 iOS/Android 加入主畫面用）
icons/icon-180.png ...         App 圖示
netlify/functions/translate.js Groq API 代理（金鑰藏在伺服器端，不會外洩）
netlify.toml                   Netlify 部署設定
```

## 部署步驟（Netlify）

### 1. 免費申請 Groq API 金鑰

1. 到 https://console.groq.com 註冊（可用 Google 帳號登入）
2. 左側選單找到 **API Keys** → **Create API Key**
3. 複製產生的金鑰（只會顯示一次，先存起來）

Groq 目前對個人用量提供免費額度，不需要綁信用卡。

### 2. 把這個資料夾推上 GitHub

```bash
cd english-practice-v2
git init
git add .
git commit -m "升級版：Tailwind + iOS PWA + AI 翻譯 + 間隔複習"
git branch -M main
git remote add origin https://github.com/<你的帳號>/english-practice-v2.git
git push -u origin main
```

（也可以直接把整個資料夾拖進 GitHub Desktop 或網頁版 GitHub 上傳。）

### 3. 用 Netlify 連接這個 repo

1. 登入 https://app.netlify.com
2. **Add new site → Import an existing project → GitHub**，選剛剛的 repo
3. Build command 留空、Publish directory 留空（netlify.toml 已經設定好 `publish = "."`）
4. 部署前先點 **Show advanced → New variable**，新增環境變數：
   - Key: `GROQ_API_KEY`
   - Value: 貼上第 1 步拿到的金鑰
5. 按 **Deploy site**

部署完成後 Netlify 會給你一個網址（例如 `https://xxx.netlify.app`），也可以在 Site settings 裡換成自訂網域。

### 4. iOS 加入主畫面

1. 用 iPhone 的 **Safari**（一定要用 Safari，不能用 Chrome）打開部署好的網址
2. 點下方分享圖示 → 往下滑找到「加入主畫面」
3. 確認後，桌面就會出現「英文練習本」的圖示，點開會是全螢幕的 App 體驗

### 5. 資料同步

第一次打開時輸入一組「同步碼」（自己取，例如 `amber-0912`），電腦跟手機都輸入同一組，兩邊資料會透過 Firebase Firestore 即時同步——延續原本 `english-practice` 專案用的同一個 Firebase 專案，資料不會遺失。

## 這次升級做了什麼

- **AI 翻譯終於能在手機用了**：改用 Groq API（免費），透過 Netlify Function 代理呼叫，金鑰不會出現在前端程式碼，不管電腦或手機都能點「✨ AI 翻譯建議」直接產生英文翻譯＋關鍵單字
- **iOS PWA**：加上 `manifest.json` 與 Apple 專屬 meta tag，Safari 可以「加入主畫面」變成全螢幕 App 圖示（未含離線快取，開啟仍需網路）
- **全新現代化介面**：改用 Tailwind CSS 重新設計，卡片式、圓角、柔和陰影
- **新增間隔重複複習**：詞彙庫的每個單字現在有複習等級（0-5），依照 Leitner 式排程（1/2/4/7/14/30 天）安排下次複習時間，新增了「複習」分頁，練習介面會先顯示英文單字，按「顯示中文意思」核對，再選「記得／忘記」調整下次複習時間
- 保留原有功能：每日句子紀錄、單字點擊標記意思、🔊 示範發音、🎤 跟讀相似度評分、連續天數印章、跨裝置同步

## 已知限制

- 未做離線快取（Service Worker），沒有網路時無法載入頁面或存取 Firestore 資料——當初決定先做「可加主畫面」這個較簡單的版本
- 同步碼是明碼存在 Firestore 文件 ID，安全性僅適合個人輕度使用
- Groq 免費額度有速率限制，若短時間內大量翻譯可能會出現「翻譯服務發生問題」，稍等再試即可
