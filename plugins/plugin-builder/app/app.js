const summaryView = document.querySelector('[data-view="summary"]');
const detailView = document.querySelector('[data-view="detail"]');
const detailContent = document.querySelector("#detail-content");
const backButton = document.querySelector("#back-button");
const pluginTitle = document.querySelector("#plugin-title");
const pluginDescription = document.querySelector("#plugin-description");
const skillsList = document.querySelector("#skills-list");
const appsList = document.querySelector("#apps-list");
const mcpList = document.querySelector("#mcp-list");
const marketplacesList = document.querySelector("#marketplaces-list");
const localDetails = document.querySelector("#local-details");
const viewButton = document.querySelector("#view-plugin");
const shareButton = document.querySelector("#share-plugin");

const state = {
  detail: null,
  model: readModel(),
};
let nextRpcId = 1;
const pendingRpc = new Map();

function decodePayload(raw) {
  if (raw == null) {
    return null;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function modelFromPayload(raw) {
  const payload = decodePayload(raw);
  if (payload == null) {
    return null;
  }
  if (payload.plugin && Array.isArray(payload.skills)) {
    return payload;
  }
  if (payload.structuredContent) {
    return modelFromPayload(payload.structuredContent);
  }
  if (Array.isArray(payload.content)) {
    for (const item of payload.content) {
      const found = modelFromPayload(item?.text ?? item);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function readModel() {
  return (
    modelFromPayload(window.openai?.toolOutput) ??
    modelFromPayload(window.openai?.toolResponseMetadata) ?? {
      plugin: {
        displayName: "Plugin summary unavailable",
        description: "Codex did not receive plugin summary data for this app.",
        viewUrl: null,
        shareUrl: null,
      },
      skills: [],
      apps: [],
      mcpServers: [],
      marketplaces: [],
      localDetails: [],
    }
  );
}

function text(value) {
  return value == null || value === "" ? "Not provided" : String(value);
}

function clear(element) {
  element.innerHTML = "";
}

function sendMcpAppMessage(message) {
  if (window.parent === window) {
    return;
  }
  window.parent.postMessage(message, "*");
}

function requestMcpApp(method, params) {
  const id = nextRpcId;
  nextRpcId += 1;

  const promise = new Promise((resolve, reject) => {
    pendingRpc.set(id, { reject, resolve });
    window.setTimeout(() => {
      const pending = pendingRpc.get(id);
      if (!pending) {
        return;
      }
      pendingRpc.delete(id);
      reject(new Error(`${method} timed out.`));
    }, 5000);
  });

  sendMcpAppMessage({
    id,
    jsonrpc: "2.0",
    method,
    params,
  });
  return promise;
}

function notifyMcpApp(method, params = {}) {
  sendMcpAppMessage({
    jsonrpc: "2.0",
    method,
    params,
  });
}

async function connectMcpApp() {
  try {
    await requestMcpApp("ui/initialize", {
      appCapabilities: {
        availableDisplayModes: ["inline", "fullscreen"],
      },
      appInfo: {
        name: "Plugin Builder",
        version: "0.1.0",
      },
      protocolVersion: "2026-01-26",
    });
    notifyMcpApp("ui/notifications/initialized");
    await requestMcpApp("ui/request-display-mode", {
      mode: "fullscreen",
    });
  } catch {
    // The inline summary remains useful if the host does not open a side panel.
  }
}

function openCodexLink(href) {
  if (typeof href !== "string" || href.length === 0) {
    return;
  }
  window.openai?.openExternal?.({ href });
}

function renderResourceList(element, items, kind) {
  clear(element);
  if (items.length === 0) {
    element.append(createEmptyRow(`No ${kind} found in this plugin.`));
    return;
  }

  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "resource-row";
    button.dataset.kind = kind;
    button.dataset.id = item.id;
    button.innerHTML = [
      `<span class="resource-name">${escapeHtml(text(item.title))}</span>`,
      `<span class="resource-summary">${escapeHtml(text(item.summary))}</span>`,
      `<span class="resource-path">${escapeHtml(text(item.pathLabel))}</span>`,
      `<span class="resource-chevron" aria-hidden="true">›</span>`,
    ].join("");
    button.addEventListener("click", () => showDetail(kind, item.id));
    element.append(button);
  }
}

function renderMetaList(element, items) {
  clear(element);
  if (items.length === 0) {
    element.append(createEmptyRow("Nothing to show here yet."));
    return;
  }
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "meta-row";
    row.innerHTML = [
      `<span class="meta-label">${escapeHtml(text(item.label))}</span>`,
      `<span class="meta-value">${escapeHtml(text(item.value))}</span>`,
    ].join("");
    element.append(row);
  }
}

function createEmptyRow(message) {
  const row = document.createElement("div");
  row.className = "empty-row";
  row.textContent = message;
  return row;
}

function renderSummary() {
  state.model = readModel();
  const model = state.model;
  pluginTitle.textContent = text(model.plugin.displayName);
  pluginDescription.textContent = text(model.plugin.description);
  viewButton.disabled = !model.plugin.viewUrl;
  shareButton.disabled = !model.plugin.shareUrl;
  renderResourceList(skillsList, model.skills, "skills");
  renderResourceList(appsList, model.apps, "apps");
  renderResourceList(mcpList, model.mcpServers, "mcpServers");
  renderMetaList(marketplacesList, model.marketplaces);
  renderMetaList(localDetails, model.localDetails);
}

function showDetail(kind, id) {
  const detail =
    kind === "skills"
      ? state.model.skills.find((item) => item.id === id)
      : kind === "apps"
        ? state.model.apps.find((item) => item.id === id)
        : state.model.mcpServers.find((item) => item.id === id);

  if (!detail) {
    return;
  }

  state.detail = { kind, item: detail };
  summaryView.hidden = true;
  detailView.hidden = false;
  detailContent.innerHTML = detailMarkup(state.detail);
}

function hideDetail() {
  state.detail = null;
  detailView.hidden = true;
  summaryView.hidden = false;
}

function detailMarkup(detail) {
  const item = detail.item;
  const title =
    detail.kind === "skills"
      ? `${escapeHtml(text(item.title))} / SKILL.md`
      : escapeHtml(text(item.title));
  const kicker =
    detail.kind === "skills"
      ? "Filesystem skill"
      : detail.kind === "apps"
        ? "Plugin app"
        : "MCP server";
  const blocks =
    detail.kind === "skills"
      ? skillDetailBlocks(item)
      : detail.kind === "apps"
        ? appDetailBlocks(item)
        : mcpDetailBlocks(item);

  return `
    <article class="detail-card">
      <header class="detail-header">
        <span class="detail-kicker">${escapeHtml(kicker)}</span>
        <h2 class="detail-title">${title}</h2>
        <p class="detail-copy">${escapeHtml(text(item.summary))}</p>
      </header>
      <div class="detail-grid">${blocks}</div>
    </article>
  `;
}

function skillDetailBlocks(item) {
  const headings =
    item.headings?.length > 0
      ? `<ul>${item.headings
          .map((heading) => `<li>${escapeHtml(text(heading))}</li>`)
          .join("")}</ul>`
      : "<p>No headings detected in this skill body.</p>";
  return [
    detailBlock("Source", `<code class="detail-code">${escapeHtml(text(item.pathLabel))}</code>`),
    detailBlock("Frontmatter summary", `<p>${escapeHtml(text(item.frontmatterSummary))}</p>`),
    detailBlock("Content outline", headings),
    detailBlock("Preview", `<p>${escapeHtml(text(item.preview))}</p>`),
  ].join("");
}

function appDetailBlocks(item) {
  return [
    detailBlock("Definition", `<code class="detail-code">${escapeHtml(text(item.pathLabel))}</code>`),
    detailBlock("App id", `<p>${escapeHtml(text(item.appId))}</p>`),
  ].join("");
}

function mcpDetailBlocks(item) {
  return [
    detailBlock("Definition", `<code class="detail-code">${escapeHtml(text(item.pathLabel))}</code>`),
    detailBlock("Command", `<code class="detail-code">${escapeHtml(text(item.commandLabel))}</code>`),
  ].join("");
}

function detailBlock(title, body) {
  return `
    <section class="detail-block">
      <h3>${escapeHtml(title)}</h3>
      ${body}
    </section>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

viewButton.addEventListener("click", () => {
  openCodexLink(state.model.plugin.viewUrl);
});
shareButton.addEventListener("click", () => {
  openCodexLink(state.model.plugin.shareUrl);
});
backButton.addEventListener("click", hideDetail);

window.addEventListener("message", (event) => {
  const message = event.data;
  if (
    !message ||
    message.jsonrpc !== "2.0" ||
    !pendingRpc.has(message.id) ||
    (!("result" in message) && !("error" in message))
  ) {
    return;
  }

  const pending = pendingRpc.get(message.id);
  pendingRpc.delete(message.id);
  if (message.error) {
    pending.reject(new Error(message.error.message || "MCP app request failed."));
    return;
  }
  pending.resolve(message.result || {});
});

window.addEventListener("openai:set_globals", renderSummary);

renderSummary();
connectMcpApp();
