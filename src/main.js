"use strict";

const { addIcon, ItemView, Notice, Plugin, PluginSettingTab, Setting, setIcon, TFile } = require("obsidian");

/* 由 tools/build.js 在构建时替换成真正的单文件页面（JSON 字符串） */
const EMBEDDED_PAGE = null;

const VIEW_TYPE = "zhushroom-page-view";
const ICON_ID = "zhushroom-pig";
const ICON_ID_MUSHROOM = "zhushroom-mushroom";

const PIG_ICON = `
  <g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.5 8 4 4.5l4 1.2M18.5 8 20 4.5l-4 1.2" />
    <path d="M12 5c-5.5 0-9 3.4-9 8s3.7 8 9 8 9-3.4 9-8-3.5-8-9-8Z" />
    <path d="M8.5 11h.01M15.5 11h.01" />
    <ellipse cx="12" cy="15.4" rx="3.1" ry="2.2" />
    <path d="M11 15.4h.01M13 15.4h.01" />
  </g>`;

const MUSHROOM_ICON = `
  <g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3.6 12.2C3.6 7.6 7.4 4 12 4s8.4 3.6 8.4 8.2c0 .6-.5 1-1.1 1H4.7c-.6 0-1.1-.4-1.1-1Z" />
    <path d="M9.6 13.4v3.3c0 1.9 1.1 3.3 2.4 3.3s2.4-1.4 2.4-3.3v-3.3" />
    <path d="M8.6 9.5h.01M12 7.3h.01M15.4 9.5h.01" />
  </g>`;

const DEFAULT_SETTINGS = {
  pageSource: "embedded", // embedded | vault
  pagePath: "猪事顺利.html",
  dataRoot: "日程",
  logo: "pig"
};

class ZhushroomView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.frame = null;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return this.plugin.manifest.name;
  }

  getIcon() {
    return this.plugin.settings.logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
  }

  async onOpen() {
    const host = this.contentEl;
    host.empty();
    host.style.padding = "0";
    host.style.overflow = "hidden";

    const html = await this.plugin.readPage();
    if (!html) {
      host.createEl("p", { text: "没有可显示的页面：请在插件设置里选择「内置页面」，或指定库内页面文件。" });
      return;
    }

    const frame = host.createEl("iframe", {
      attr: {
        style: "width:100%;height:100%;border:0;display:block;background:#fff",
        title: this.getDisplayText()
      }
    });
    frame.srcdoc = html;
    this.frame = frame;
  }

  async onClose() {
    this.frame = null;
    this.contentEl.empty();
  }
}

class ZhushroomSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("页面来源")
      .setDesc("内置页面随插件一起发布；库内页面则读取你库里的单文件 html。")
      .addDropdown((drop) =>
        drop
          .addOption("embedded", "内置页面")
          .addOption("vault", "库内文件")
          .setValue(this.plugin.settings.pageSource)
          .onChange(async (value) => {
            this.plugin.settings.pageSource = value;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
            this.display();
          })
      );

    if (this.plugin.settings.pageSource === "vault") {
      new Setting(containerEl)
        .setName("页面文件路径")
        .setDesc("相对库根目录，例如 猪事顺利.html")
        .addText((text) =>
          text
            .setPlaceholder("猪事顺利.html")
            .setValue(this.plugin.settings.pagePath)
            .onChange(async (value) => {
              this.plugin.settings.pagePath = value.trim() || DEFAULT_SETTINGS.pagePath;
              await this.plugin.saveSettings();
              this.plugin.refreshAllViews();
            })
        );
    }

    new Setting(containerEl)
      .setName("数据目录")
      .setDesc("日程、心情、习惯与复盘写在这个目录下，默认为 日程。")
      .addText((text) =>
        text
          .setPlaceholder("日程")
          .setValue(this.plugin.settings.dataRoot)
          .onChange(async (value) => {
            this.plugin.settings.dataRoot = (value.trim() || DEFAULT_SETTINGS.dataRoot).replace(/^\/+|\/+$/g, "");
            await this.plugin.saveSettings();
            await this.plugin.ensureDataRoot();
          })
      );

    new Setting(containerEl)
      .setName("侧边栏图标")
      .addDropdown((drop) =>
        drop
          .addOption("pig", "小猪")
          .addOption("mushroom", "蘑菇")
          .setValue(this.plugin.settings.logo)
          .onChange(async (value) => {
            await this.plugin.setLogo(value);
          })
      );
  }
}

module.exports = class ZhushroomPlugin extends Plugin {
  async onload() {
    addIcon(ICON_ID, PIG_ICON);
    addIcon(ICON_ID_MUSHROOM, MUSHROOM_ICON);

    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new ZhushroomView(leaf, this));

    const iconId = this.settings.logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
    this.ribbonEl = this.addRibbonIcon(iconId, "打开猪事顺利", () => this.openPage());
    this.addCommand({ id: "open", name: "打开猪事顺利", callback: () => this.openPage() });

    this.addSettingTab(new ZhushroomSettingTab(this.app, this));

    this.registerDomEvent(window, "message", (ev) => this.onFrameMessage(ev));

    this.app.workspace.onLayoutReady(async () => {
      await this.ensureDataRoot();
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async loadSettings() {
    const data = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /* 读页面：内置页面优先，库内模式读不到就回退内置，避免白屏 */
  async readPage() {
    if (this.settings.pageSource === "vault") {
      const path = this.settings.pagePath || DEFAULT_SETTINGS.pagePath;
      try {
        if (await this.app.vault.adapter.exists(path)) {
          return await this.app.vault.adapter.read(path);
        }
      } catch (e) {
        console.error("[猪事顺利] 读取库内页面失败", e);
      }
      new Notice("没找到 " + path + "，已改用内置页面");
    }
    return EMBEDDED_PAGE;
  }

  async openPage(silent) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    if (!EMBEDDED_PAGE && this.settings.pageSource === "embedded") {
      if (!silent) new Notice("插件里没有内置页面，请在设置里指定库内页面");
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  refreshAllViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      const view = leaf.view;
      if (view && typeof view.onOpen === "function") view.onOpen();
      try {
        leaf.updateHeader();
      } catch (e) {}
    });
  }

  async ensureDataRoot() {
    const root = this.settings.dataRoot || DEFAULT_SETTINGS.dataRoot;
    const adapter = this.app.vault.adapter;
    try {
      if (!(await adapter.exists(root))) await adapter.mkdir(root);
    } catch (e) {
      console.error("[猪事顺利] 创建数据目录失败", e);
    }
  }

  /* 页面与插件之间的桥：握手 + 按数据目录读写文件 */
  async onFrameMessage(ev) {
    const d = ev.data;
    if (!d || typeof d !== "object") return;

    const view = this.app.workspace
      .getLeavesOfType(VIEW_TYPE)
      .map((l) => l.view)
      .find((v) => v && v.frame && v.frame.contentWindow === ev.source);
    if (!view) return;

    if (d.zsPing) {
      ev.source.postMessage({ zsPong: true, rootName: this.settings.dataRoot }, "*");
      return;
    }
    if (!d.zsReq) return;

    try {
      const value = await this.doFsOp(d.op, d.args || {});
      ev.source.postMessage({ zsReply: true, id: d.id, ok: true, value: value }, "*");
    } catch (e) {
      ev.source.postMessage({ zsReply: true, id: d.id, ok: false, error: String((e && e.message) || e) }, "*");
    }
  }

  async setLogo(kind) {
    const logo = kind === "mushroom" ? "mushroom" : "pig";
    const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
    this.settings.logo = logo;
    if (this.ribbonEl) setIcon(this.ribbonEl, iconId);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      if (leaf.view) leaf.view.getIcon = () => iconId;
      try {
        leaf.updateHeader();
      } catch (e) {}
    });
    await this.saveSettings();
  }

  async doFsOp(op, a) {
    const adapter = this.app.vault.adapter;
    const root = this.settings.dataRoot || DEFAULT_SETTINGS.dataRoot;
    const full = (p) => {
      const rel = String(p == null ? "" : p).replace(/^\/+/, "");
      return rel ? root + "/" + rel : root;
    };
    const ensureDir = async (path) => {
      const cut = path.lastIndexOf("/");
      if (cut <= 0) return;
      const dir = path.slice(0, cut);
      if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
    };

    switch (op) {
      case "read": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) return null;
        return await adapter.read(path);
      }
      case "write": {
        const path = full(a.path);
        await ensureDir(path);
        const text = String(a.data == null ? "" : a.data);
        const existing = this.app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) {
          await this.app.vault.modify(existing, text);
        } else {
          try {
            await this.app.vault.create(path, text);
          } catch (e) {
            await adapter.write(path, text);
          }
        }
        return "ok";
      }
      case "exists":
        return await adapter.exists(full(a.path));
      case "mkdir": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) await adapter.mkdir(path);
        return "ok";
      }
      case "remove": {
        const path = full(a.path);
        if (await adapter.exists(path)) await adapter.remove(path);
        return "ok";
      }
      case "list": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) return [];
        const listed = await adapter.list(path);
        const prefix = path + "/";
        return listed.files
          .map((p) => ({ name: p.slice(prefix.length), kind: "file" }))
          .concat(listed.folders.map((p) => ({ name: p.slice(prefix.length), kind: "directory" })));
      }
      case "setLogo":
        await this.setLogo(a.kind);
        return "ok";
      default:
        throw new Error("未知操作：" + op);
    }
  }
};
