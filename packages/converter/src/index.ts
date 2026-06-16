import type {
  ClipboardPayload,
  ConversionMode,
  ConversionOptions,
  ConversionWarning
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
