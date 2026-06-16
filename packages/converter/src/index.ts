import type {
  ClipboardPayload,
  ConversionMode,
  ConversionOptions,
  ConversionWarning,
  DocumentIntent,
  DocumentIntentBlock,
  DocumentIntentTone,
  NativeDocExecutionPayload,
  NativeDocOperation,
  NativeDocPlan
} from "@html-to-docs/shared";

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TR"
]);

const BASIC_STYLE_ALLOWLIST = new Set([
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
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "text-decoration",
  "white-space",
  "width",
  "max-width",
  "overflow",
  "vertical-align"
]);

const PRO_STYLE_ALLOWLIST = new Set([
  ...BASIC_STYLE_ALLOWLIST,
  "letter-spacing"
]);

const NAMED_PATTERN_STYLES: Record<string, Record<string, string>> = {
  t1: {
    color: "#166534",
    "background-color": "#ecfdf3",
    border: "1px solid #bbf7d0",
    "border-radius": "10px",
    padding: "1px 8px",
    "font-weight": "700"
  },
  t2: {
    color: "#5b21b6",
    "background-color": "#f5f0ff",
    border: "1px solid #ddd6fe",
    "border-radius": "10px",
    padding: "1px 8px",
    "font-weight": "700"
  },
  ptag: {
    color: "#0c1f3f",
    "background-color": "#eef7ff",
    border: "1px solid #b9dcff",
    "border-radius": "10px",
    padding: "2px 9px",
    "font-weight": "700"
  },
  ok: {
    color: "#166534",
    "font-weight": "700"
  },
  warn: {
    color: "#92400e",
    "font-weight": "700"
  },
  bad: {
    color: "#991b1b",
    "font-weight": "700"
  }
};

export function convertHtmlToClipboardPayload(
  sourceHtml: string,
  options: ConversionOptions
): ClipboardPayload {
  if (options.mode === "confluence-pro" && options.licenseStatus !== "free") {
    const intent = extractDocumentIntent(sourceHtml);
    return {
      html: renderProClipboardHtml(intent),
      text: renderIntentPlainText(intent),
      warnings: intent.warnings
    };
  }

  const warnings: ConversionWarning[] = [];
  const parser = new DOMParser();
  const document = parser.parseFromString(sourceHtml, "text/html");
  const root = document.body.cloneNode(true) as HTMLElement;

  sanitizeNode(root, options.mode, warnings);

  if (options.mode === "confluence-pro" && options.licenseStatus === "free") {
    warnings.push({
      code: "pro-locked",
      message: "Pro design preservation is locked in the free MVP."
    });
    sanitizeNode(root, "confluence-basic", warnings);
  }

  const html = normalizeWhitespace(root.innerHTML);
  const text = normalizePlainText(root.textContent ?? "");

  return {
    html,
    text,
    warnings
  };
}

export function extractDocumentIntent(sourceHtml: string): DocumentIntent {
  const warnings: ConversionWarning[] = [];
  const parser = new DOMParser();
  const document = parser.parseFromString(sourceHtml, "text/html");
  const blocks: DocumentIntentBlock[] = [];
  let blockIndex = 1;

  const nextId = (): string => `block-${blockIndex++}`;

  for (const child of Array.from(document.body.children)) {
    blocks.push(...extractBlocksFromElement(child, nextId, warnings));
  }

  const firstHeading = blocks.find((block) => block.type === "heading" && block.text);
  const title = firstHeading?.text ?? (document.title.trim() || "Untitled document");

  return {
    title,
    blocks,
    stats: {
      headings: blocks.filter((block) => block.type === "heading").length,
      callouts: blocks.filter((block) => block.type === "callout").length,
      tables: blocks.filter((block) => block.type === "table").length,
      codeBlocks: blocks.filter((block) => block.type === "code").length,
      lists: blocks.filter((block) => block.type === "list").length
    },
    warnings
  };
}

export function createConfluenceNativeDocPlan(intent: DocumentIntent): NativeDocPlan {
  const outline = intent.blocks
    .filter((block) => block.type === "heading" && block.text)
    .map((block) => `${"#".repeat(block.level ?? 1)} ${block.text}`);
  const operations = createNativeDocOperations(intent.blocks);
  const summary = [
    `${intent.blocks.length} intent blocks`,
    `${intent.stats.headings} headings`,
    `${intent.stats.callouts} callouts`,
    `${intent.stats.tables} tables`,
    `${intent.stats.codeBlocks} code blocks`
  ].join(" · ");
  const bodyMarkdown = renderConfluenceMarkdown(intent);

  return {
    target: "confluence",
    title: intent.title,
    summary,
    outline,
    operations,
    bodyMarkdown,
    executionPayload: createMcpExecutionPayload(intent.title, bodyMarkdown),
    intent
  };
}

function sanitizeNode(
  node: Element,
  mode: ConversionMode,
  warnings: ConversionWarning[]
): void {
  const doc = node.ownerDocument;
  const walker = doc.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];

  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element);
  }

  for (const element of elements) {
    const tagName = element.tagName;

    if (tagName === "SCRIPT" || tagName === "IFRAME" || tagName === "FORM") {
      warnings.push({
        code: "removed-script",
        message: `Removed unsupported <${tagName.toLowerCase()}> element.`
      });
      element.remove();
      continue;
    }

    rewriteReportPattern(element, mode);
    sanitizeAttributes(element, mode, warnings);
  }
}

function rewriteReportPattern(element: Element, mode: ConversionMode): void {
  const className = String(element.getAttribute("class") ?? "").toLowerCase();
  const classList = className.split(/\s+/).filter(Boolean);
  const role = String(element.getAttribute("role") ?? "").toLowerCase();
  const isCard = /card|panel|tile|phase|step/.test(className);
  const isBadge = /badge|pill|tag|status|ptag/.test(className) || classList.includes("t");
  const isCallout = /callout|alert|note|warning|info|tldr|danger/.test(className) || role === "note";

  for (const classToken of classList) {
    const style = NAMED_PATTERN_STYLES[classToken];
    if (!style) {
      continue;
    }

    element.setAttribute("style", mergeInlineStyle(element.getAttribute("style"), style));
  }

  if (isCard) {
    element.setAttribute("data-html-to-docs", "card");
    if (mode === "confluence-pro") {
      element.setAttribute(
        "style",
        mergeInlineStyle(element.getAttribute("style"), {
          border: "1px solid #dfe1e6",
          "border-radius": "6px",
          padding: "12px",
          margin: "12px 0"
        })
      );
    }
  }

  if (isBadge) {
    element.setAttribute("data-html-to-docs", "badge");
    if (mode === "confluence-pro") {
      element.setAttribute(
        "style",
        mergeInlineStyle(element.getAttribute("style"), {
          border: "1px solid #dfe1e6",
          "border-radius": "999px",
          padding: "2px 8px",
          "font-weight": "600"
        })
      );
    }
  }

  if (isCallout) {
    element.setAttribute("data-html-to-docs", "callout");
    if (mode === "confluence-pro") {
      element.setAttribute(
        "style",
        mergeInlineStyle(element.getAttribute("style"), {
          border: "1px solid #b6c2cf",
          "border-radius": "6px",
          padding: "12px",
          margin: "12px 0",
          "background-color": className.includes("danger") ? "#fff7ed" : "#f7f8f9",
          color: "#172b4d"
        })
      );
    }
  }
}

function escapeGeneratedHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeAttributes(
  element: Element,
  mode: ConversionMode,
  warnings: ConversionWarning[]
): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();

    if (name.startsWith("on")) {
      element.removeAttribute(attribute.name);
      warnings.push({
        code: "removed-unsafe-attribute",
        message: `Removed unsafe ${attribute.name} attribute.`
      });
      continue;
    }

    if (name === "style") {
      const filteredStyle = filterInlineStyle(attribute.value, mode);
      const readableStyle = normalizeStyleForReadablePaste(filteredStyle, element.tagName);
      if (readableStyle) {
        element.setAttribute("style", readableStyle);
      } else {
        element.removeAttribute("style");
        pushWarningOnce(warnings, {
          code: "removed-style",
          message: "Removed unsupported inline styles."
        });
      }
      continue;
    }

    if (name === "class" || name === "id" || name.startsWith("data-")) {
      continue;
    }

    if (element.tagName === "A" && (name === "href" || name === "title")) {
      continue;
    }

    if (
      element.tagName === "IMG" &&
      (name === "src" || name === "alt" || name === "title" || name === "width" || name === "height")
    ) {
      continue;
    }

    element.removeAttribute(attribute.name);
  }

  if (mode === "confluence-basic" && element.tagName === "DIV" && isLayoutOnly(element)) {
    warnings.push({
      code: "simplified-layout",
      message: "Simplified a layout-only block for stable Confluence paste."
    });
  }
}

function normalizeStyleForReadablePaste(style: string, tagName: string): string {
  if (!style) {
    return "";
  }

  const styles = parseStyle(style);
  const background = styles.get("background-color");
  const color = styles.get("color");

  if (background && isDarkColor(background)) {
    styles.set("background-color", isTableSection(tagName) ? "#f7f8f9" : "#ffffff");
    if (!color || isDarkColor(color) || isLightColor(color)) {
      styles.set("color", "#172b4d");
    }
  }

  if (color && isLightColor(color) && (!background || !isDarkColor(background))) {
    styles.set("color", "#172b4d");
  }

  return serializeStyle(styles);
}

function parseStyle(style: string): Map<string, string> {
  const styles = new Map<string, string>();

  for (const part of style.split(";")) {
    const [rawProperty, ...rawValueParts] = part.split(":");
    const rawValue = rawValueParts.join(":");
    if (!rawProperty || !rawValue) {
      continue;
    }

    styles.set(rawProperty.trim().toLowerCase(), rawValue.trim());
  }

  return styles;
}

function serializeStyle(styles: Map<string, string>): string {
  return Array.from(styles.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

function isTableSection(tagName: string): boolean {
  return tagName === "TD" || tagName === "TH" || tagName === "TR" || tagName === "TABLE";
}

function isDarkColor(value: string): boolean {
  const rgb = parseRgb(value);
  if (!rgb) {
    return false;
  }

  return relativeLuminance(rgb) < 0.18;
}

function isLightColor(value: string): boolean {
  const rgb = parseRgb(value);
  if (!rgb) {
    return false;
  }

  return relativeLuminance(rgb) > 0.82;
}

function parseRgb(value: string): [number, number, number] | null {
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  const hexMatch = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1];
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16)
  ];
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function filterInlineStyle(style: string, mode: ConversionMode): string {
  const allowlist = mode === "confluence-pro" ? PRO_STYLE_ALLOWLIST : BASIC_STYLE_ALLOWLIST;

  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const [property] = part.split(":");
      return allowlist.has(property.trim().toLowerCase());
    })
    .join("; ");
}

function mergeInlineStyle(
  currentStyle: string | null,
  additions: Record<string, string>
): string {
  const styles = new Map<string, string>();

  for (const [property, value] of parseStyle(currentStyle ?? "")) {
    styles.set(property, value);
  }

  for (const [property, value] of Object.entries(additions)) {
    styles.set(property, value);
  }

  return serializeStyle(styles);
}

function isLayoutOnly(element: Element): boolean {
  const className = String(element.getAttribute("class") ?? "").toLowerCase();
  return /grid|flex|layout|row|column|container/.test(className);
}

function pushWarningOnce(warnings: ConversionWarning[], warning: ConversionWarning): void {
  if (warnings.some((item) => item.code === warning.code && item.message === warning.message)) {
    return;
  }

  warnings.push(warning);
}

function extractBlocksFromElement(
  element: Element,
  nextId: () => string,
  warnings: ConversionWarning[]
): DocumentIntentBlock[] {
  const tagName = element.tagName;

  if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "IFRAME" || tagName === "FORM") {
    warnings.push({
      code: "removed-script",
      message: `Ignored unsupported <${tagName.toLowerCase()}> element while extracting intent.`
    });
    return [];
  }

  if (/^H[1-6]$/.test(tagName)) {
    const text = normalizeInlineText(element.textContent ?? "");
    return text
      ? [
          {
            id: nextId(),
            type: "heading",
            level: Number(tagName.slice(1)),
            text
          }
        ]
      : [];
  }

  if (tagName === "P") {
    const text = normalizeInlineText(element.textContent ?? "");
    return text ? [{ id: nextId(), type: "paragraph", text }] : [];
  }

  if (tagName === "PRE") {
    const codeElement = element.querySelector("code");
    const language = detectCodeLanguage(codeElement ?? element);
    const text = trimPreservingCode(codeElement?.textContent ?? element.textContent ?? "");
    return text ? [{ id: nextId(), type: "code", text, language }] : [];
  }

  if (tagName === "UL" || tagName === "OL") {
    const items = Array.from(element.children)
      .filter((child) => child.tagName === "LI")
      .map((child) => normalizeInlineText(child.textContent ?? ""))
      .filter(Boolean);
    return items.length > 0
      ? [{ id: nextId(), type: "list", ordered: tagName === "OL", items }]
      : [];
  }

  if (tagName === "TABLE") {
    return [extractTableBlock(element, nextId())].filter((block) => {
      return (block.headers?.length ?? 0) > 0 || (block.rows?.length ?? 0) > 0;
    });
  }

  if (tagName === "BLOCKQUOTE" || isIntentCallout(element)) {
    const text = normalizeInlineText(element.textContent ?? "");
    return text
      ? [
          {
            id: nextId(),
            type: "callout",
            tone: detectTone(element),
            text
          }
        ]
      : [];
  }

  if (tagName === "HR") {
    return [{ id: nextId(), type: "divider" }];
  }

  const nestedBlocks = Array.from(element.children).flatMap((child) =>
    extractBlocksFromElement(child, nextId, warnings)
  );

  if (nestedBlocks.length > 0) {
    return nestedBlocks;
  }

  const fallbackText = normalizeInlineText(element.textContent ?? "");
  return fallbackText ? [{ id: nextId(), type: "paragraph", text: fallbackText }] : [];
}

function extractTableBlock(element: Element, id: string): DocumentIntentBlock {
  const allRows = Array.from(element.querySelectorAll("tr"));
  const headers: string[] = [];
  const rows: string[][] = [];

  for (const [index, row] of allRows.entries()) {
    const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
      normalizeInlineText(cell.textContent ?? "")
    );

    if (cells.length === 0) {
      continue;
    }

    const hasHeaderCells = row.querySelectorAll("th").length > 0;
    if (index === 0 && hasHeaderCells) {
      headers.push(...cells);
      continue;
    }

    rows.push(cells);
  }

  return {
    id,
    type: "table",
    headers,
    rows
  };
}

function createNativeDocOperations(blocks: DocumentIntentBlock[]): NativeDocOperation[] {
  const operations: NativeDocOperation[] = [];
  const headingBlocks = blocks.filter((block) => block.type === "heading");
  const calloutBlocks = blocks.filter((block) => block.type === "callout");
  const tableBlocks = blocks.filter((block) => block.type === "table");
  const codeBlocks = blocks.filter((block) => block.type === "code");
  const flowBlocks = blocks.filter((block) =>
    ["heading", "paragraph", "list", "divider"].includes(block.type)
  );

  if (flowBlocks.length > 0) {
    operations.push({
      id: "op-document-flow",
      label: "Build editable page flow",
      description: "Create Confluence headings, paragraphs, lists, and separators in source order.",
      blockIds: flowBlocks.map((block) => block.id)
    });
  }

  if (headingBlocks.length > 0) {
    operations.push({
      id: "op-outline",
      label: "Preserve document outline",
      description: "Use heading levels as the native Confluence page structure.",
      blockIds: headingBlocks.map((block) => block.id)
    });
  }

  if (calloutBlocks.length > 0) {
    operations.push({
      id: "op-callouts",
      label: "Convert callouts",
      description: "Map notes, warnings, and alerts to Confluence-native info or warning panels.",
      blockIds: calloutBlocks.map((block) => block.id)
    });
  }

  if (tableBlocks.length > 0) {
    operations.push({
      id: "op-tables",
      label: "Rebuild tables",
      description: "Create editable Confluence tables instead of pasted screenshots or raw HTML.",
      blockIds: tableBlocks.map((block) => block.id)
    });
  }

  if (codeBlocks.length > 0) {
    operations.push({
      id: "op-code",
      label: "Preserve code blocks",
      description: "Use Confluence code blocks with detected language labels when available.",
      blockIds: codeBlocks.map((block) => block.id)
    });
  }

  return operations;
}

function isIntentCallout(element: Element): boolean {
  const className = String(element.getAttribute("class") ?? "").toLowerCase();
  const role = String(element.getAttribute("role") ?? "").toLowerCase();
  return /callout|alert|note|warning|info|tldr|danger|success/.test(className) || role === "note";
}

function detectTone(element: Element): DocumentIntentTone {
  const className = String(element.getAttribute("class") ?? "").toLowerCase();
  const text = String(element.textContent ?? "").toLowerCase();

  if (/danger|error|bad|critical/.test(className) || /🚨|❌/.test(text)) {
    return "danger";
  }

  if (/warning|warn|caution/.test(className) || /⚠️|주의|경고/.test(text)) {
    return "warning";
  }

  if (/success|ok|done/.test(className) || /✅|완료/.test(text)) {
    return "success";
  }

  if (/info|note|tip|tldr/.test(className)) {
    return "info";
  }

  return "neutral";
}

function detectCodeLanguage(element: Element | null): string | undefined {
  if (!element) {
    return undefined;
  }

  const className = String(element.getAttribute("class") ?? "");
  const match = className.match(/(?:language|lang)-([a-z0-9-]+)/i);
  return match?.[1];
}

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function trimPreservingCode(text: string): string {
  return text.replace(/^\n+|\n+$/g, "");
}

function renderConfluenceMarkdown(intent: DocumentIntent): string {
  return intent.blocks
    .map((block) => renderIntentBlockMarkdown(block))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function renderIntentBlockMarkdown(block: DocumentIntentBlock): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level ?? 1)} ${block.text ?? ""}`.trim();
    case "paragraph":
      return block.text ?? "";
    case "callout":
      return renderCalloutMarkdown(block);
    case "list":
      return renderListMarkdown(block);
    case "table":
      return renderTableMarkdown(block);
    case "code":
      return renderCodeMarkdown(block);
    case "divider":
      return "---";
    default:
      return "";
  }
}

function renderCalloutMarkdown(block: DocumentIntentBlock): string {
  const labelByTone: Record<DocumentIntentTone, string> = {
    info: "Info",
    success: "Success",
    warning: "Warning",
    danger: "Important",
    neutral: "Note"
  };
  const label = labelByTone[block.tone ?? "neutral"];
  return `> **${label}:** ${block.text ?? ""}`.trim();
}

function renderListMarkdown(block: DocumentIntentBlock): string {
  return (block.items ?? [])
    .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

function renderTableMarkdown(block: DocumentIntentBlock): string {
  const rows = block.rows ?? [];
  const headers = block.headers?.length ? block.headers : rows[0] ?? [];
  const bodyRows = block.headers?.length ? rows : rows.slice(1);

  if (headers.length === 0) {
    return "";
  }

  return [
    `| ${headers.map(escapeMarkdownTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...bodyRows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`)
  ].join("\n");
}

function renderCodeMarkdown(block: DocumentIntentBlock): string {
  return [`\`\`\`${block.language ?? ""}`, block.text ?? "", "```"].join("\n");
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function createMcpExecutionPayload(title: string, body: string): NativeDocExecutionPayload {
  return {
    tool: "atlassian-rovo.createConfluencePage",
    contentFormat: "markdown",
    title,
    body,
    requiredInputs: ["cloudId", "spaceId", "parentId or explicit create location"]
  };
}

function renderProClipboardHtml(intent: DocumentIntent): string {
  const blocks = intent.blocks;
  const body = [
    renderProTitle(intent),
    renderProDocumentMap(intent),
    ...blocks.slice(blocks[0]?.type === "heading" ? 1 : 0).map(renderProBlockHtml)
  ]
    .filter(Boolean)
    .join("\n\n");

  return normalizeWhitespace(`<section data-html-to-docs="pro-rendered">${body}</section>`);
}

function renderProTitle(intent: DocumentIntent): string {
  return [
    `<h1 style="${proStyle({
      margin: "0 0 8px",
      color: "#0c1f3f",
      "font-size": "30px",
      "line-height": "1.25",
      "font-weight": "800"
    })}">${escapeGeneratedHtml(intent.title)}</h1>`,
    `<p style="${proStyle({
      margin: "0 0 16px",
      color: "#44546f",
      "font-size": "13px"
    })}">Converted with html-to-docs Pro · service-ready Confluence output</p>`
  ].join("\n");
}

function renderProDocumentMap(intent: DocumentIntent): string {
  const headings = intent.blocks
    .filter((block) => block.type === "heading" && block.text)
    .slice(1, 9);

  if (headings.length === 0) {
    return "";
  }

  const items = headings
    .map((heading) => {
      const prefix = heading.level && heading.level > 2 ? "&nbsp;&nbsp;" : "";
      return `<li>${prefix}${escapeGeneratedHtml(heading.text ?? "")}</li>`;
    })
    .join("");

  return [
    `<div data-html-to-docs="pro-document-map" style="${proStyle({
      border: "1px solid #85b8ff",
      "border-left": "4px solid #0c66e4",
      "border-radius": "6px",
      "background-color": "#f0f6ff",
      padding: "12px 14px",
      margin: "16px 0",
      color: "#172b4d"
    })}">`,
    `<p style="${proStyle({ margin: "0 0 6px", "font-weight": "700" })}">Document map</p>`,
    `<p style="${proStyle({ margin: "0 0 8px", color: "#44546f" })}">Sections ${headings.length} · Tables ${intent.stats.tables} · Callouts ${intent.stats.callouts} · Code ${intent.stats.codeBlocks}</p>`,
    `<ol style="${proStyle({ margin: "0", "padding-left": "20px" })}">${items}</ol>`,
    `</div>`
  ].join("");
}

function renderProBlockHtml(block: DocumentIntentBlock): string {
  switch (block.type) {
    case "heading":
      return renderProHeading(block);
    case "paragraph":
      return renderProParagraph(block.text ?? "");
    case "callout":
      return renderProCallout(block);
    case "list":
      return renderProList(block);
    case "table":
      return renderProTable(block);
    case "code":
      return renderProCode(block);
    case "divider":
      return `<hr style="${proStyle({ border: "0", "border-top": "1px solid #dfe1e6", margin: "20px 0" })}">`;
    default:
      return "";
  }
}

function renderProHeading(block: DocumentIntentBlock): string {
  const level = Math.min(Math.max(block.level ?? 2, 2), 4);
  const text = escapeGeneratedHtml(block.text ?? "");
  const style =
    level === 2
      ? proStyle({
          "border-left": "4px solid #0c66e4",
          "background-color": "#f7f8f9",
          padding: "8px 10px",
          margin: "28px 0 12px",
          color: "#0c1f3f",
          "font-size": "22px",
          "font-weight": "750"
        })
      : proStyle({
          color: "#172b4d",
          "border-bottom": "1px solid #dfe1e6",
          padding: "0 0 4px",
          margin: "20px 0 8px",
          "font-size": level === 3 ? "18px" : "15px",
          "font-weight": "700"
        });

  return `<h${level} style="${style}">${text}</h${level}>`;
}

function renderProParagraph(text: string): string {
  return `<p style="${proStyle({
    margin: "8px 0",
    color: "#172b4d",
    "line-height": "1.65"
  })}">${escapeGeneratedHtml(text)}</p>`;
}

function renderProCallout(block: DocumentIntentBlock): string {
  const toneStyles: Record<DocumentIntentTone, Record<string, string>> = {
    info: { border: "#85b8ff", background: "#f0f6ff", label: "Info" },
    success: { border: "#7ee2b8", background: "#e3fcef", label: "Success" },
    warning: { border: "#f5cd47", background: "#fff7d6", label: "Warning" },
    danger: { border: "#ffbdad", background: "#fff4f0", label: "Important" },
    neutral: { border: "#b6c2cf", background: "#f7f8f9", label: "Note" }
  };
  const tone = toneStyles[block.tone ?? "neutral"];

  return [
    `<div data-html-to-docs="pro-callout" style="${proStyle({
      border: `1px solid ${tone.border}`,
      "border-left": `4px solid ${tone.border}`,
      "border-radius": "6px",
      "background-color": tone.background,
      padding: "12px 14px",
      margin: "14px 0",
      color: "#172b4d"
    })}">`,
    `<p style="${proStyle({ margin: "0 0 4px", "font-weight": "700" })}">${tone.label}</p>`,
    `<p style="${proStyle({ margin: "0", "line-height": "1.6" })}">${escapeGeneratedHtml(block.text ?? "")}</p>`,
    `</div>`
  ].join("");
}

function renderProList(block: DocumentIntentBlock): string {
  const tag = block.ordered ? "ol" : "ul";
  const items = (block.items ?? [])
    .map((item) => `<li style="${proStyle({ margin: "4px 0" })}">${escapeGeneratedHtml(item)}</li>`)
    .join("");
  return `<${tag} style="${proStyle({ margin: "8px 0", "padding-left": "24px", "line-height": "1.6" })}">${items}</${tag}>`;
}

function renderProTable(block: DocumentIntentBlock): string {
  const headers = block.headers ?? [];
  const rows = block.rows ?? [];
  const headerHtml =
    headers.length > 0
      ? `<tr>${headers
          .map(
            (header) =>
              `<th style="${proStyle({
                border: "1px solid #dfe1e6",
                "background-color": "#e9f2ff",
                color: "#0c1f3f",
                padding: "8px 10px",
                "font-weight": "700",
                "text-align": "left"
              })}">${escapeGeneratedHtml(header)}</th>`
          )
          .join("")}</tr>`
      : "";
  const rowHtml = rows
    .map((row, rowIndex) => {
      const background = rowIndex % 2 === 0 ? "#ffffff" : "#f7f8f9";
      return `<tr>${row
        .map(
          (cell) =>
            `<td style="${proStyle({
              border: "1px solid #dfe1e6",
              "background-color": background,
              padding: "8px 10px",
              "vertical-align": "top"
            })}">${escapeGeneratedHtml(cell)}</td>`
        )
        .join("")}</tr>`;
    })
    .join("");

  return `<table style="${proStyle({
    width: "100%",
    "border-collapse": "collapse",
    margin: "14px 0",
    "font-size": "14px"
  })}">${headerHtml}${rowHtml}</table>`;
}

function renderProCode(block: DocumentIntentBlock): string {
  return [
    block.language
      ? `<p style="${proStyle({ margin: "8px 0 4px", color: "#44546f", "font-size": "12px", "font-weight": "700" })}">${escapeGeneratedHtml(block.language)}</p>`
      : "",
    `<pre style="${proStyle({
      border: "1px solid #dfe1e6",
      "border-radius": "6px",
      "background-color": "#f7f8f9",
      padding: "12px",
      margin: "10px 0",
      color: "#172b4d",
      "line-height": "1.55",
      "white-space": "pre-wrap"
    })}"><code>${escapeGeneratedHtml(block.text ?? "")}</code></pre>`
  ]
    .filter(Boolean)
    .join("");
}

function renderIntentPlainText(intent: DocumentIntent): string {
  return normalizePlainText(
    intent.blocks
      .map((block) => {
        if (block.type === "heading") {
          return `${"#".repeat(block.level ?? 1)} ${block.text ?? ""}`;
        }
        if (block.type === "list") {
          return (block.items ?? []).join("\n");
        }
        if (block.type === "table") {
          return [...(block.headers ?? []), ...(block.rows ?? []).flat()].join(" ");
        }
        return block.text ?? "";
      })
      .join("\n")
  );
}

function proStyle(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

function normalizeWhitespace(html: string): string {
  return html.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizePlainText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function shouldInsertLineBreak(tagName: string): boolean {
  return BLOCK_TAGS.has(tagName.toUpperCase());
}
