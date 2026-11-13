# 提交到 Obsidian 插件目录

## 提交前（本仓库已满足，改动后重跑）

```
node tools/build.js        # 把页面打进 main.js
node test/harness.js       # 假 Obsidian 环境冒烟
node tools/check-manifest.js
```

Release 的 tag 必须等于 `manifest.json` 的 `version`，附件必须恰好是 `main.js` 与 `manifest.json`：

```
gh release upload 1.0.0 main.js manifest.json --clobber
```

## 提交

1. 打开 https://community.obsidian.md ，用 Obsidian 账号登录
2. 关联 GitHub 账号（只需一次）
3. 「Submit a plugin」填仓库地址 `Falling-anyway/zhushi-ribbon`
4. 审核通过后，Obsidian 里的「社区插件」直接搜 Zhushroom Calendar

## 提交时可能被问到的信息

| 项 | 值 |
| :--- | :--- |
| 仓库 | `https://github.com/Falling-anyway/zhushi-ribbon` |
| id | `zhushroom-calendar` |
| name | `Zhushroom Calendar` |
| version | `1.0.0` |
| 数据存放 | 库内 `日程/` 目录，纯 Markdown |
| 网络请求 | 无；页面与图标全部打包在插件内 |
| 桌面端限制 | `isDesktopOnly: true`（用了 iframe 与 File System 桥） |
