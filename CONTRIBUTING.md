# 参与开发

## 报告问题

在 https://github.com/Falling-anyway/zhushroom-calendar/issues 新建 issue，说明：

- Obsidian 版本、插件版本
- 复现步骤（打开哪个视图、点了什么）
- 控制台报错（`Ctrl+Shift+I` → Console）

## 本地开发

```
node tools/build.js <单文件页面路径>   # 把页面内联进 main.js
node --check main.js                   # 语法检查
node test/harness.js                   # 假 Obsidian 环境冒烟测试
node tools/check-manifest.js           # manifest 合规自检
node tools/check-listing.js            # 社区目录审核与收录状态
```

- 改插件逻辑改 `src/main.js`，改页面改外部的单文件 html，然后重新构建
- `main.js` 是构建产物，但必须提交进仓库：Obsidian 直接下载它，社区目录的 release 附件也用它
- 提 PR 前请确保上面四条命令都通过

## 约定

- 不引入远程加载的代码、`eval`、`new Function`，也不做代码混淆（社区目录硬性要求）
- 页面相关的逻辑尽量留在页面里，插件只负责「打开视图」和「文件读写桥」
- 用户数据只写 Markdown 到库内数据目录，不上传任何地方
- 提交信息用中文或英文均可，一句话说明改动

## 许可

贡献的代码按 [MIT](LICENSE) 授权。
