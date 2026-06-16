import { convertHtmlToClipboardPayload } from "@html-to-docs/converter";
import type { ClipboardPayload, ConversionMode } from "@html-to-docs/shared";
import "./styles.css";

type SourceMode = "tab" | "file";

const i18n = (key: string): string => chrome.i18n.getMessage(key) || key;

const state: {
  sourceMode: SourceMode;
  conversionMode: ConversionMode;
  fileHtml: string | null;
  fileName: string | null;
} = {
  sourceMode: "tab",
  conversionMode: "confluence-basic",
  fileHtml: null,
  fileName: null
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Popup root not found.");
}

const root = app;

render();

function render(status = "", warnings: string[] = []): void {
  root.innerHTML = `
    <section class="shell">
      <header>
        <h1>html-to-docs</h1>
        <p>${i18n("extensionDescription")}</p>
      </header>

      <section class="field">
        <span class="label">${i18n("sourceLabel")}</span>
        <div class="segmented" role="group" aria-label="${i18n("sourceLabel")}">
          <button data-source="tab" class="${state.sourceMode === "tab" ? "active" : ""}">
            ${i18n("currentTab")}
          </button>
          <button data-source="file" class="${state.sourceMode === "file" ? "active" : ""}">
            ${i18n("localFile")}
          </button>
        </div>
      </section>

      <label class="file ${state.sourceMode === "file" ? "" : "hidden"}">
        <span>${i18n("openHtmlFile")}</span>
        <input id="html-file" type="file" accept=".html,text/html" />
        <small>${state.fileName ?? ""}</small>
      </label>

      <section class="field">
        <span class="label">${i18n("modeLabel")}</span>
        <div class="segmented" role="group" aria-label="${i18n("modeLabel")}">
          <button data-mode="confluence-basic" class="${state.conversionMode === "confluence-basic" ? "active" : ""}">
            ${i18n("basicMode")}
          </button>
          <button data-mode="confluence-pro" class="${state.conversionMode === "confluence-pro" ? "active" : ""}">
            ${i18n("proMode")}
          </button>
        </div>
        ${state.conversionMode === "confluence-pro" ? `<p class="notice">${i18n("proLocked")}</p>` : ""}
      </section>

      <button id="copy" class="primary">${i18n("copyForConfluence")}</button>

      <p id="status" class="status">${status}</p>
      ${warnings.length > 0 ? renderWarnings(warnings) : ""}
    </section>
  `;

  bindEvents();
}

function renderWarnings(warnings: string[]): string {
  return `
    <section class="warnings">
      <h2>${i18n("warningsLabel")}</h2>
      <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
    </section>
  `;
}

function bindEvents(): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-source]")) {
    button.addEventListener("click", () => {
      state.sourceMode = button.dataset.source as SourceMode;
      render();
    });
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.addEventListener("click", () => {
      state.conversionMode = button.dataset.mode as ConversionMode;
      render();
    });
  }

  root.querySelector<HTMLInputElement>("#html-file")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    state.fileName = file.name;
    state.fileHtml = await file.text();
    render();
  });

  root.querySelector<HTMLButtonElement>("#copy")?.addEventListener("click", copyForConfluence);
}

async function copyForConfluence(): Promise<void> {
  const html = state.sourceMode === "file" ? state.fileHtml : await captureCurrentTabHtml();

  if (!html) {
    render(state.sourceMode === "file" ? i18n("selectHtmlFile") : i18n("tabReadFailed"));
    return;
  }

  const payload = convertHtmlToClipboardPayload(html, {
    target: "confluence",
    mode: state.conversionMode,
    licenseStatus: "free"
  });

  try {
    await writeClipboardPayload(payload);
    render(
      i18n("copied"),
      payload.warnings.map((warning) => warning.message)
    );
  } catch {
    render(i18n("copyFailed"));
  }
}

async function captureCurrentTabHtml(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    return null;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    });

    return typeof result?.result === "string" ? result.result : null;
  } catch {
    return null;
  }
}

async function writeClipboardPayload(payload: ClipboardPayload): Promise<void> {
  if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" })
        })
      ]);
      return;
    } catch {
      // Fall through to execCommand. Chrome extension popups can be picky here.
    }
  }

  copyWithSelectionFallback(payload);
}

function copyWithSelectionFallback(payload: ClipboardPayload): void {
  const container = document.createElement("div");
  container.contentEditable = "true";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1px";
  container.style.height = "1px";
  container.style.overflow = "hidden";
  container.innerHTML = payload.html;

  const onCopy = (event: ClipboardEvent): void => {
    event.preventDefault();
    event.clipboardData?.setData("text/html", payload.html);
    event.clipboardData?.setData("text/plain", payload.text);
  };

  document.body.append(container);
  document.addEventListener("copy", onCopy);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand("copy");

  document.removeEventListener("copy", onCopy);
  selection?.removeAllRanges();
  container.remove();

  if (!copied) {
    throw new Error("Clipboard fallback failed.");
  }
}

function escapeHtml(value: string): string {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}
