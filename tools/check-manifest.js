"use strict";

/*
 * 上架前的 manifest 自检，规则来自 Obsidian 社区目录的提交要求。
 * 运行：node tools/check-manifest.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const problems = [];

const raw = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
let m;
try {
  m = JSON.parse(raw);
} catch (e) {
  console.error("manifest.json 不是合法 JSON：" + e.message);
  process.exit(1);
}

const required = ["id", "name", "version", "minAppVersion", "description", "author"];
for (const key of required) {
  if (!m[key] || typeof m[key] !== "string" || !m[key].trim()) problems.push("缺少字段 " + key);
}

if (m.id) {
  if (!/^[a-z0-9-]+$/.test(m.id)) problems.push("id 只能是小写字母、数字和连字符：" + m.id);
  if (m.id.toLowerCase().includes("obsidian")) problems.push("id 不能包含 obsidian");
}
if (m.version && !/^\d+\.\d+\.\d+$/.test(m.version)) problems.push("version 必须是 x.y.z：" + m.version);
if (m.description) {
  if (m.description.length > 250) problems.push("description 超过 250 字符");
  if (!/[.。!]$/.test(m.description)) problems.push("description 必须以句号结尾");
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(m.description)) problems.push("description 不能有 emoji");
}
if (typeof m.isDesktopOnly !== "boolean") problems.push("isDesktopOnly 必须是布尔值");
if (m.fundingUrl && typeof m.fundingUrl !== "string") problems.push("fundingUrl 必须是字符串");

for (const file of ["README.md", "LICENSE", "main.js"]) {
  if (!fs.existsSync(path.join(root, file))) problems.push("缺少文件 " + file);
}

const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
if (main.includes("const EMBEDDED_PAGE = null;")) problems.push("main.js 里的内置页面没有被构建进去");
if (!main.includes("__ZS_STORE_BUILD__")) problems.push("内置页面缺少商店版标记");
if (/eval\(|new Function\(/.test(main)) problems.push("main.js 里出现了 eval / new Function");

if (problems.length) {
  console.error("FAIL\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("PASS manifest " + m.id + " " + m.version + "（description " + m.description.length + " 字符）");
