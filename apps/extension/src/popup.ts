import {
  convertHtmlToClipboardPayload,
  createConfluenceNativeDocPlan,
  extractDocumentIntent
} from "@html-to-docs/converter";
import type { ClipboardPayload, ConversionMode, NativeDocPlan } from "@html-to-docs/shared";
import "./styles.css";

type SourceMode = "tab" | "file";

const i18n = (key: string): string => chrome.i18n.getMessage(key) || key;
const SNAPSHOT_STYLE_PROPERTIES = [
  "color",
  "background-color",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-collapse",
  "border-radius",
  "box-sizing",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "text-decoration",
  "white-space",
  "width",
  "max-width",
  "vertical-align",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "overflow",
  "letter-spacing"
] as const;

const state: {
  sourceMode: SourceMode;
  conversionMode: ConversionMode;
  fileHtml: string | null;
  fileName: string | null;
  nativeDocPlan: NativeDocPlan | null;
} = {
  sourceMode: "tab",
  conversionMode: "confluence-basic",
  fileHtml: null,
  fileName: null,
  nativeDocPlan: null
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
        ${state.conversionMode === "confluence-pro" ? `<p class="notice">${i18n("proPreview")}</p>` : ""}
      </section>

      <button id="copy" class="primary">${i18n("copyForConfluence")}</button>
      ${
        state.conversionMode === "confluence-pro"
          ? `<button id="mcp-preview" class="secondary">${i18n("previewNativeDocPlan")}</button>`
          : ""
      }

      <p id="status" class="status">${status}</p>
      ${warnings.length > 0 ? renderWarnings(warnings) : ""}
      ${state.nativeDocPlan ? renderNativeDocPlan(state.nativeDocPlan) : ""}
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

function renderNativeDocPlan(plan: NativeDocPlan): string {
  return `
    <section class="native-plan">
      <div>
        <span class="label">${i18n("nativeDocPlanLabel")}</span>
        <h2>${escapeHtml(plan.title)}</h2>
        <p>${escapeHtml(plan.summary)}</p>
      </div>

      ${
        plan.outline.length > 0
          ? `
            <section class="preview-group">
              <h3>${i18n("outlineLabel")}</h3>
              <ol>${plan.outline.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
            </section>
          `
          : ""
      }

      <section class="preview-group">
        <h3>${i18n("operationsLabel")}</h3>
        <ul>
          ${plan.operations
            .map(
              (operation) => `
                <li>
                  <strong>${escapeHtml(operation.label)}</strong>
                  <span>${escapeHtml(operation.description)}</span>
                </li>
              `
            )
            .join("")}
        </ul>
      </section>

      <section class="preview-group">
        <h3>${i18n("nativePageBodyLabel")}</h3>
        <pre>${escapeHtml(plan.bodyMarkdown)}</pre>
      </section>

      <section class="preview-group">
        <h3>${i18n("executionPayloadLabel")}</h3>
        <pre>${escapeHtml(JSON.stringify(plan.executionPayload, null, 2))}</pre>
      </section>
    </section>
  `;
}

function bindEvents(): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-source]")) {
    button.addEventListener("click", () => {
      state.sourceMode = button.dataset.source as SourceMode;
      state.nativeDocPlan = null;
      render();
    });
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.addEventListener("click", () => {
      state.conversionMode = button.dataset.mode as ConversionMode;
      state.nativeDocPlan = null;
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
    state.nativeDocPlan = null;
    render();
  });

  root.querySelector<HTMLButtonElement>("#copy")?.addEventListener("click", copyForConfluence);
  root.querySelector<HTMLButtonElement>("#mcp-preview")?.addEventListener("click", previewNativeDocPlan);
}

async function copyForConfluence(): Promise<void> {
  const html = await getSourceHtmlForConversion();

  if (!html) {
    render(state.sourceMode === "file" ? i18n("selectHtmlFile") : i18n("tabReadFailed"));
    return;
  }

  const payload = convertHtmlToClipboardPayload(html, {
    target: "confluence",
    mode: state.conversionMode,
    licenseStatus: state.conversionMode === "confluence-pro" ? "pro" : "free"
  });

  try {
    state.nativeDocPlan = null;
    await writeClipboardPayload(payload);
    render(
      i18n("copied"),
      payload.warnings.map((warning) => warning.message)
    );
  } catch {
    render(i18n("copyFailed"));
  }
}

async function previewNativeDocPlan(): Promise<void> {
  const html = await getSourceHtmlForConversion();

  if (!html) {
    render(state.sourceMode === "file" ? i18n("selectHtmlFile") : i18n("tabReadFailed"));
    return;
  }

  const intent = extractDocumentIntent(html);
  state.nativeDocPlan = createConfluenceNativeDocPlan(intent);
  render(i18n("nativeDocPlanReady"), intent.warnings.map((warning) => warning.message));
}

async function getSourceHtmlForConversion(): Promise<string | null> {
  if (state.sourceMode === "tab") {
    return captureCurrentTabHtml();
  }

  if (!state.fileHtml) {
    return null;
  }

  return snapshotHtmlFromString(state.fileHtml);
}

async function captureCurrentTabHtml(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    return null;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: snapshotCurrentPageForHtmlToDocs
    });

    return typeof result?.result === "string" ? result.result : null;
  } catch {
    return null;
  }
}

async function snapshotHtmlFromString(html: string): Promise<string> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "960px";
  iframe.style.height = "1200px";
  iframe.style.opacity = "0";
  iframe.srcdoc = stripScripts(html);

  document.body.append(iframe);

  await new Promise<void>((resolve) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
  });

  const snapshot = iframe.contentDocument
    ? snapshotDocumentForPaste(iframe.contentDocument)
    : html;
  iframe.remove();

  return snapshot;
}

function stripScripts(html: string): string {
  return removePrefersColorSchemeDarkBlocks(
    html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  );
}

function removePrefersColorSchemeDarkBlocks(html: string): string {
  const mediaPattern = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/gi;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = mediaPattern.exec(html))) {
    const start = match.index;
    const blockStart = mediaPattern.lastIndex - 1;
    const blockEnd = findCssBlockEnd(html, blockStart);

    if (blockEnd === -1) {
      break;
    }

    output += html.slice(cursor, start);
    cursor = blockEnd + 1;
    mediaPattern.lastIndex = cursor;
  }

  return output + html.slice(cursor);
}

function findCssBlockEnd(source: string, openingBraceIndex: number): number {
  let depth = 0;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function snapshotDocumentForPaste(sourceDocument: Document): string {
  const sourceBody = sourceDocument.body;
  const clonedBody = sourceBody.cloneNode(true) as HTMLElement;
  const sourceElements = [sourceBody, ...Array.from(sourceBody.querySelectorAll<HTMLElement>("*"))];
  const clonedElements = [clonedBody, ...Array.from(clonedBody.querySelectorAll<HTMLElement>("*"))];

  for (let index = 0; index < sourceElements.length; index += 1) {
    inlineComputedStyle(sourceDocument.defaultView, sourceElements[index], clonedElements[index]);
  }

  return `<!doctype html><html><body>${clonedBody.innerHTML}</body></html>`;
}

function inlineComputedStyle(
  view: Window | null,
  sourceElement: HTMLElement | undefined,
  clonedElement: HTMLElement | undefined
): void {
  if (!view || !sourceElement || !clonedElement) {
    return;
  }

  const computedStyle = view.getComputedStyle(sourceElement);
  const inlineStyle = SNAPSHOT_STYLE_PROPERTIES
    .map((property) => {
      const value = computedStyle.getPropertyValue(property);
      return value ? `${property}: ${value}` : "";
    })
    .filter(Boolean)
    .join("; ");

  if (inlineStyle) {
    clonedElement.setAttribute("style", inlineStyle);
  }
}

function snapshotCurrentPageForHtmlToDocs(): string {
  const styleProperties = [
    "color",
    "background-color",
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-collapse",
    "border-radius",
    "box-sizing",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "line-height",
    "text-align",
    "text-decoration",
    "white-space",
    "width",
    "max-width",
    "vertical-align",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "overflow",
    "letter-spacing"
  ];
  const sourceBody = document.body;
  const clonedBody = sourceBody.cloneNode(true) as HTMLElement;
  const sourceElements = [sourceBody, ...Array.from(sourceBody.querySelectorAll<HTMLElement>("*"))];
  const clonedElements = [clonedBody, ...Array.from(clonedBody.querySelectorAll<HTMLElement>("*"))];

  for (let index = 0; index < sourceElements.length; index += 1) {
    const sourceElement = sourceElements[index];
    const clonedElement = clonedElements[index];
    if (!sourceElement || !clonedElement) {
      continue;
    }

    const computedStyle = window.getComputedStyle(sourceElement);
    const inlineStyle = styleProperties
      .map((property) => {
        const value = computedStyle.getPropertyValue(property);
        return value ? `${property}: ${value}` : "";
      })
      .filter(Boolean)
      .join("; ");

    if (inlineStyle) {
      clonedElement.setAttribute("style", inlineStyle);
    }
  }

  return `<!doctype html><html><body>${clonedBody.innerHTML}</body></html>`;
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
