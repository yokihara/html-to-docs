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

const PRO_STYLE_ALLOWLIST = new Set([
  "color",
  "background-color",
  "border",
  "border-radius",
  "padding",
  "margin",
  "font-weight",
  "font-style",
  "text-align",
  "width",
  "max-width",
  "vertical-align"
]);

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
  const role = String(element.getAttribute("role") ?? "").toLowerCase();
  const isCard = /card|panel|tile/.test(className);
  const isBadge = /badge|pill|tag|status/.test(className);
  const isCallout = /callout|alert|note|warning|info/.test(className) || role === "note";

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
          "background-color": "#f7f8f9"
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
      if (mode === "confluence-basic") {
        element.removeAttribute("style");
        warnings.push({
          code: "removed-style",
          message: "Removed inline styles in Basic mode."
        });
        continue;
      }

      element.setAttribute("style", filterInlineStyle(attribute.value));
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

function filterInlineStyle(style: string): string {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const [property] = part.split(":");
      return PRO_STYLE_ALLOWLIST.has(property.trim().toLowerCase());
    })
    .join("; ");
}

function mergeInlineStyle(
  currentStyle: string | null,
  additions: Record<string, string>
): string {
  const styles = new Map<string, string>();

  for (const part of (currentStyle ?? "").split(";")) {
    const [rawProperty, rawValue] = part.split(":");
    if (!rawProperty || !rawValue) {
      continue;
    }
    styles.set(rawProperty.trim().toLowerCase(), rawValue.trim());
  }

  for (const [property, value] of Object.entries(additions)) {
    styles.set(property, value);
  }

  return Array.from(styles.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

function isLayoutOnly(element: Element): boolean {
  const className = String(element.getAttribute("class") ?? "").toLowerCase();
  return /grid|flex|layout|row|column|container/.test(className);
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

