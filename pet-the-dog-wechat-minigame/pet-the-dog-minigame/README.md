# 撸狗模拟器 360° — 微信小程序工程

本工程为**零外部依赖的微信小程序原生项目**（`<canvas type="2d">` 2D 渲染 + `wx.createWebAudioContext()` 合成音效），已内含 7 大真实犬种 53 张高清实拍图（总资源约 1.1MB），解压后可直接导入**微信开发者工具**运行与真机预览。

## 项目结构

```
pet-the-dog-minigame/
├── app.js / app.json / app.wxss      # 小程序入口与全局配置
├── pages/index/                       # 首页（全屏 canvas 交互）
│   ├── index.wxml / index.wxss / index.json
│   └── index.js                       # 核心渲染与交互逻辑
├── js/
│   ├── breeds.js                      # 犬种与 360° 帧数据
│   ├── storage.js                     # 本地存储
│   ├── ui.js                          # 按钮/情绪条绘制与命中检测
│   ├── audio.js                       # WebAudio 合成音效
│   └── ad.js                          # 激励视频广告
└── assets/dogs/                       # 7 犬种 53 张实拍图
```

## 快速导入与运行步骤

1. 下载并安装最新版 **微信开发者工具**。
2. 解压本压缩包，打开微信开发者工具 → 选择 **「小程序」** → 点击 **「导入项目」**。
3. 项目目录选择解压后的 `pet-the-dog-minigame` 文件夹：
   - 本地试玩：AppID 保持默认的 `touristappid`（游客模式）即可直接运行；
   - 真机预览与提审：填入你在微信公众平台注册的**小程序正式 AppID**。
4. 点击右上角 **「预览」** 即可用手机微信扫码体验 360° 撸狗、抓毛/梳毛/泡泡/吹毛道具、喂骨头与上传自家狗狗照片。

## IAA 广告变现与上线清单

1. **开通流量主（无版号路线）**：在微信公众平台选择「不需要开通虚拟支付（IAA）」，完成小程序备案后即可上线。
2. **接入激励视频广告**：打开 `js/ad.js`，将 `REWARD_AD_UNIT_ID` 替换为你在微信公众平台申请的激励视频广告位 ID，即可实现「看广告解锁上传定制自家狗狗」。
3. **内容安全检测（提审必备）**：上传自家狗狗照片属于用户生成内容（UGC），需接入微信内容安全检测 `wx.mediaCheckAsync`。该接口需要 `openid`（由后端 `wx.login` → `code2session` 换取后通过 `wx.setStorageSync('openid', ...)` 写入）。未配置 `openid` 时检测会自动放行，本地调试不受影响。
4. **接入云端 AI 多视角生成（进阶）**：目前点击「+ 定制狗狗」会通过 `wx.chooseMedia` 读取本地相册直接生成专属宠物；上线后可将图片通过 `wx.uploadFile` 上传至你的后端服务，经内容安全检测与多视角生图 API 生成 7 张标准图后返回 URL 即可。

## 注意事项

- **AppID**：`project.config.json` 中的 AppID 需为**小程序** AppID（非小游戏 AppID）。
- **音效**：`js/audio.js` 使用 `wx.createWebAudioContext` 合成音效，部分基础库版本可能不支持而静默无声（已有特性检测兜底，不会报错）。如需保证全机型有声，建议改为 `wx.createInnerAudioContext` + 预置音频文件。
- **隐私**：上传相册照片涉及敏感权限，提审前需在小程序后台配置《用户隐私保护指引》并在代码中做授权。
