#!/usr/bin/env node
// 查看插件在社区目录里的上架状态：审核状态、是否已进入客户端可读的插件清单。
// 用法：node tools/check-listing.js
// 走系统代理（HTTPS_PROXY/HTTP_PROXY 或 Windows 注册表里的 127.0.0.1:7890），因为 Node 不会自动用系统代理。
const https = require("https");
const net = require("net");
const tls = require("tls");
const { execSync } = require("child_process");

const ID = "zhushroom-calendar";

function systemProxy() {
  for (const k of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"]) {
    if (process.env[k]) return process.env[k].replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  if (process.platform === "win32") {
    try {
      const out = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer', {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const m = /ProxyServer\s+REG_SZ\s+(\S+)/.exec(out);
      if (m) return m[1].split(";")[0].replace(/^https?=/, "");
    } catch (e) {
      /* 没有代理就直接连 */
    }
  }
  return null;
}

const PROXY = systemProxy();

function getOnce(url) {
  const u = new URL(url);
  const port = u.port || 443;
  const target = () => tls.connect({ host: u.hostname, port, servername: u.hostname });
  const socket = new Promise((resolve, reject) => {
    if (!PROXY) return resolve(target());
    const [ph, pp] = PROXY.split(":");
    const raw = net.connect({ host: ph, port: Number(pp || 80) }, () => {
      raw.write(`CONNECT ${u.hostname}:${port} HTTP/1.1\r\nHost: ${u.hostname}:${port}\r\n\r\n`);
    });
    raw.once("data", (buf) => {
      if (!/^HTTP\/1\.[01] 200/.test(buf.toString())) return reject(new Error("代理拒绝：" + buf.toString().split("\r\n")[0]));
      raw.removeAllListeners("data");
      const t = tls.connect({ socket: raw, servername: u.hostname }, () => resolve(t));
      t.on("error", reject);
    });
    raw.on("error", reject);
  });
  return socket.then(
    (s) =>
      new Promise((resolve, reject) => {
        const req = https.request(
          { host: u.hostname, path: u.pathname + u.search, method: "GET", createConnection: () => s, headers: { "user-agent": "zhushroom-listing-check" } },
          (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              res.resume();
              return resolve(getOnce(res.headers.location));
            }
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (d) => (body += d));
            res.on("end", () => resolve({ status: res.statusCode, body }));
          }
        );
        req.on("error", reject);
        req.setTimeout(20000, () => req.destroy(new Error("超时")));
        req.end();
      })
  );
}

async function main() {
  const page = await getOnce(`https://community.obsidian.md/plugins/${ID}`);
  const flat = page.body.replace(/\\"/g, '"');
  const key = '"children":"Review"';
  const at = flat.indexOf(key);
  const after = at < 0 ? "" : /"children":"([^"]+)"/.exec(flat.slice(at + key.length, at + key.length + 300));
  const review = after ? after[1] : "未找到";
  console.log(`页面：${page.status}  ${page.body.includes("A new scan is in progress.") ? "扫描中" : ""}`);
  console.log(`Review：${review}`);

  let list;
  try {
    list = await getOnce("https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json");
  } catch (e) {
    console.log(`插件清单：拉取失败（${e.message || e.code || "未知错误"}）`);
    return;
  }
  if (list.status !== 200) {
    console.log(`插件清单：HTTP ${list.status}`);
    return;
  }
  let entries;
  try {
    entries = JSON.parse(list.body);
  } catch (e) {
    console.log(`插件清单：解析失败（${e.message}）`);
    return;
  }
  const hit = entries.find((p) => p.id === ID);
  console.log(`客户端清单：共 ${entries.length} 条，本插件${hit ? "已收录" : "尚未收录（Obsidian 里还搜不到）"}`);
  if (hit) console.log(JSON.stringify(hit));
}

main().catch((e) => {
  console.error("检查失败：" + (e.message || e.code || e));
  process.exit(1);
});
