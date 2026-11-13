"use strict";

/*
 * 无 Obsidian 环境下的冒烟测试：
 *  - 用假 app / 假 adapter（真实文件系统临时目录）加载 main.js
 *  - 验证内置页面已注入、商店版标记存在
 *  - 验证桥：zsPing 握手、zsReq 写入文件、目录自动创建
 *
 * 运行：node test/harness.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const notices = [];
let viewFactory = null;

/* 插件里用到了 window.setTimeout 与 window message 事件，Node 下给个最小实现 */
global.window = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  addEventListener() {},
  removeEventListener() {}
};

class FakePlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this._data = null;
  }
  async loadData() {
    return this._data;
  }
  async saveData(d) {
    this._data = d;
  }
  addRibbonIcon() {
    return {};
  }
  addCommand() {}
  addSettingTab(tab) {
    this.tab = tab;
  }
  registerView(type, factory) {
    viewFactory = factory;
  }
  registerDomEvent() {}
}

class FakeItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.contentEl = leaf.contentEl;
  }
}

class FakeSetting {
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  setPlaceholder() {
    return this;
  }
  addDropdown() {
    return this;
  }
  addText() {
    return this;
  }
}

class FakePluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
  }
}

const obsidianMock = {
  Plugin: FakePlugin,
  ItemView: FakeItemView,
  PluginSettingTab: FakePluginSettingTab,
  Setting: FakeSetting,
  Notice: class {
    constructor(msg) {
      notices.push(msg);
    }
  },
  TFile: class {},
  setIcon() {},
  addIcon() {}
};

const origLoad = Module._load;
Module._load = function (request) {
  if (request === "obsidian") return obsidianMock;
  return origLoad.apply(this, arguments);
};

const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "zhushroom-vault-"));

const adapter = {
  async exists(p) {
    return fs.existsSync(path.join(vaultDir, p));
  },
  async read(p) {
    return fs.readFileSync(path.join(vaultDir, p), "utf8");
  },
  async write(p, data) {
    fs.mkdirSync(path.dirname(path.join(vaultDir, p)), { recursive: true });
    fs.writeFileSync(path.join(vaultDir, p), data, "utf8");
  },
  async mkdir(p) {
    fs.mkdirSync(path.join(vaultDir, p), { recursive: true });
  },
  async remove(p) {
    fs.rmSync(path.join(vaultDir, p), { force: true, recursive: true });
  },
  async list(p) {
    const dir = path.join(vaultDir, p);
    const names = fs.readdirSync(dir);
    const files = [];
    const folders = [];
    for (const n of names) {
      const st = fs.statSync(path.join(dir, n));
      (st.isDirectory() ? folders : files).push(p + "/" + n);
    }
    return { files, folders };
  }
};

const app = {
  vault: {
    adapter,
    getAbstractFileByPath() {
      return null;
    },
    async create(p, data) {
      await adapter.write(p, data);
    },
    async modify(f, data) {
      await adapter.write(f.path, data);
    }
  },
  workspace: {
    onLayoutReady(cb) { this._ready = cb; },
    getLeavesOfType() {
      return this._leaves || [];
    },
    async revealLeaf() {},
    getLeaf() {
      const leaf = {
        view: null,
        async setViewState(state) {
          this.view = viewFactory(this);
          await this.view.onOpen();
        }
      };
      return leaf;
    }
  }
};

function makeLeaf() {
  const el = {
    style: {},
    children: [],
    empty() {
      this.children = [];
    },
    createEl(tag, opts) {
      const node = { tag, opts, style: {}, attrs: (opts && opts.attr) || {} };
      this.children.push(node);
      return node;
    }
  };
  return { contentEl: el, view: null };
}

(async () => {
  const pluginPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "main.js");
const PluginClass = require(pluginPath);
  const plugin = new PluginClass(app, { name: "Zhushroom Calendar", id: "zhushroom-calendar" });
  await plugin.onload();
  if (app.workspace._ready) await app.workspace._ready();

  const problems = [];

  if (plugin.settings.pageSource !== "embedded") problems.push("默认页面来源不是 embedded");
  if (!fs.existsSync(path.join(vaultDir, "日程")) && (await adapter.exists("日程")) === false) {
    problems.push("数据目录没有被创建");
  }

  const leaf = makeLeaf();
  const view = viewFactory(leaf);
  await view.onOpen();
  const frame = leaf.contentEl.children.find((c) => c.tag === "iframe");
  if (!frame) problems.push("视图里没有 iframe");
  else {
    const html = frame.attrs === undefined ? frame.srcdoc : frame.srcdoc;
    const src = frame.srcdoc;
    if (!src || src.length < 300000) problems.push("iframe 的页面内容太小：" + (src ? src.length : 0));
    if (src && !src.includes("__ZS_STORE_BUILD__")) problems.push("页面缺少商店版标记");
    if (src && !src.includes("猪事顺利")) problems.push("页面内容看起来不是猪事顺利");
    if (frame.opts && frame.opts.attr && frame.opts.attr.style.indexOf("width:100%") === -1) {
      problems.push("iframe 样式不对");
    }
  }

  const replies = [];
  const source = { postMessage: (m) => replies.push(m) };
  view.frame = { contentWindow: source };
  app.workspace._leaves = [{ view, updateHeader() {} }];

  await plugin.onFrameMessage({ data: { zsPing: true }, source });
  if (!replies.some((r) => r.zsPong)) problems.push("握手没回 zsPong");

  await plugin.onFrameMessage({
    data: { zsReq: true, id: 7, op: "write", args: { path: "01-每日日程/2026-11-13.md", data: "# 测试\n" } },
    source
  });
  const written = path.join(vaultDir, "日程", "01-每日日程", "2026-11-13.md");
  if (!fs.existsSync(written)) problems.push("桥写入失败，文件不存在");
  else if (fs.readFileSync(written, "utf8") !== "# 测试\n") problems.push("写入内容不一致");

  const reply = replies.find((r) => r.zsReply && r.id === 7);
  if (!reply || reply.ok !== true) problems.push("写入操作没有回 ok");

  const listed = await plugin.doFsOp("list", { path: "01-每日日程" });
  if (!Array.isArray(listed) || !listed.some((x) => x.name === "2026-11-13.md")) {
    problems.push("list 没列出刚写的文件");
  }

  fs.rmSync(vaultDir, { recursive: true, force: true });

  if (problems.length) {
    console.error("FAIL\n- " + problems.join("\n- "));
    process.exit(1);
  }
  console.log("PASS 视图渲染 + 商店版标记 + 桥读写 + 目录创建");
  if (notices.length) console.log("提示：" + notices.join(" / "));
})();
