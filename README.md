<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CFfQjY0ShJpDrWB3DA8m_c5rkSu3DXmc

## 快速開始

### 前置作業
- Node.js (建議 v18 以上)
- Gemini API Key

### 本地開發步驟
1. **安裝依賴套件**:
   ```bash
   npm install
   ```
2. **設定環境變數**:
   在根目錄建立 `.env.local` 檔案，內容如下：
   ```env
   GEMINI_API_KEY=你的_GEMINI_API_KEY
   ```
3. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```
   開啟瀏覽器訪問 `http://localhost:3000`

### 專案指令
- `npm run dev`: 啟動開發環境
- `npm run build`: 專案打包（輸出至 `dist/`）
- `npm run preview`: 預覽打包後的成果

## 部署與 CI/CD

本專案已設定 GitHub Actions。當程式碼推送到 `main` 分支時，會自動進行建置並部署至 GitHub Pages。

**注意**: 若要手動部署或使用其他平台，請參考 `.github/workflows/deploy.yml` 設定。
