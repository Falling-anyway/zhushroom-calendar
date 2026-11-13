"use strict";

/*
 * 从仓库里的 main.js 反推出内联页面，再按 tools/build.js 的规则重新构建一次，
 * 用来证明「提交进仓库的 main.js」确实由 src/main.js 模板 + 内联页面生成，且可复现。
 *
 * 用法：
 *   node tools/rebuild.js          # 只校验，main.js 与重建结果逐字节相同时退出码 0
 *   node tools/rebuild.js --write  # 把重建结果写到 dist/（给 release 工作流用）
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const marker = "const EMBEDDED_PAGE = null;";
const flag = '<script>window.__ZS_STORE_BUILD__=true;<\/script>';

const built = fs.readFileSync(path.join(root, "main.js"), "utf8");

/* 取出 main.js 里已经内联的页面（JSON 字面量，单行） */
const at = built.indexOf("const EMBEDDED_PAGE = ");
if (at < 0) {
  console.error("main.js 里找不到 EMBEDDED_PAGE");
  process.exit(1);
}
const start = at + "const EMBEDDED_PAGE = ".length;
const end = built.indexOf(";\n", start) >= 0 ? built.indexOf(";\n", start) : built.indexOf(";", start);
if (end < 0) {
  console.error("EMBEDDED_PAGE 赋值没有以分号结束");
  process.exit(1);
}
let page;
try {
  page = JSON.parse(built.slice(start, end));
} catch (e) {
  console.error("EMBEDDED_PAGE 不是合法 JSON：" + e.message);
  process.exit(1);
}

/* 去掉构建时注入的商店版标记，还原页面源码 */
const source = page.split(flag).join("");
if (source === page) {
  console.error("内联页面里没有商店版标记，可能不是本仓库构建出来的");
  process.exit(1);
}

/* 按构建规则重新生成 */
const template = fs.readFileSync(path.join(root, "src", "main.js"), "utf8");
if (!template.includes(marker)) {
  console.error("模板里找不到 EMBEDDED_PAGE 占位符");
  process.exit(1);
}
const rebuilt = template.replace(marker, "const EMBEDDED_PAGE = " + JSON.stringify(source.replace(/<head[^>]*>/i, (m) => m + flag)) + ";");

const same = rebuilt === built;
console.log("内联页面 " + Buffer.byteLength(source, "utf8") + " 字节");
console.log("重建结果 " + Buffer.byteLength(rebuilt, "utf8") + " 字节，与 main.js " + (same ? "逐字节相同" : "不一致"));

const writeAt = process.argv.indexOf("--write");
if (writeAt >= 0) {
  /* 输出目录：紧跟 --write 的参数，缺省 dist/ */
  const nextArg = process.argv[writeAt + 1];
  const outDir = nextArg && !nextArg.startsWith("--") ? nextArg : "dist";
  const target = path.isAbsolute(outDir) ? outDir : path.join(root, outDir);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "main.js"), rebuilt, "utf8");
  fs.copyFileSync(path.join(root, "manifest.json"), path.join(target, "manifest.json"));
  console.log("已写入 " + target + "");
}

process.exit(same ? 0 : 1);
