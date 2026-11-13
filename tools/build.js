"use strict";

/*
 * 把单文件页面内联进 main.js。
 * 页面源码默认取已脱敏的发布副本，避免把个人课表打进插件包里。
 *
 * 用法：node tools/build.js [页面路径]
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pagePath = process.argv[2] || "C:/Users/32176/Documents/zhushroom/猪事顺利.html";

const html = fs.readFileSync(pagePath, "utf8");
if (!/<html[\s>]/i.test(html)) {
  console.error("页面文件看起来不是 html：" + pagePath);
  process.exit(1);
}

const template = fs.readFileSync(path.join(root, "src", "main.js"), "utf8");
const marker = "const EMBEDDED_PAGE = null;";
if (!template.includes(marker)) {
  console.error("模板里找不到 EMBEDDED_PAGE 占位符");
  process.exit(1);
}

/* 商店版不含学在浙大同步：页面顶部注入标记，页面自己隐藏同步入口 */
const flag = "<script>window.__ZS_STORE_BUILD__=true;<\/script>";
if (!/<head[^>]*>/i.test(html)) {
  console.error("页面里找不到 <head>，无法注入商店版标记");
  process.exit(1);
}
const page = html.replace(/<head[^>]*>/i, (m) => m + flag);

const out = template.replace(marker, "const EMBEDDED_PAGE = " + JSON.stringify(page) + ";");
fs.writeFileSync(path.join(root, "main.js"), out, "utf8");

console.log("内置页面 " + Buffer.byteLength(page, "utf8") + " 字节（含商店版标记）");
console.log("main.js " + Buffer.byteLength(out, "utf8") + " 字节");
