import { describe, expect, it } from "vitest";
import {
  convertHtmlToClipboardPayload,
  createConfluenceNativeDocPlan,
  extractDocumentIntent
} from "../src";

describe("convertHtmlToClipboardPayload", () => {
  it("removes scripts and unsafe event attributes", () => {
    const result = convertHtmlToClipboardPayload(
      `<h1 onclick="alert(1)">Report</h1><script>alert(1)</script><p>Body</p>`,
      {
        target: "confluence",
        mode: "confluence-basic",
        licenseStatus: "free"
      }
    );

    expect(result.html).toContain("<h1>Report</h1>");
    expect(result.html).not.toContain("script");
    expect(result.html).not.toContain("onclick");
    expect(result.text).toContain("Report");
    expect(result.warnings.map((warning) => warning.code)).toContain("removed-script");
  });

  it("keeps allowed Pro styles when Pro is unlocked", () => {
    const result = convertHtmlToClipboardPayload(
      `<div class="card" style="color: red; position: fixed"><span class="badge">Ready</span></div>`,
      {
        target: "confluence",
        mode: "confluence-pro",
        licenseStatus: "pro"
      }
    );

    expect(result.html).toContain("data-html-to-docs=\"card\"");
    expect(result.html).toContain("color: red");
    expect(result.html).toContain("border-radius");
    expect(result.html).not.toContain("position: fixed");
  });

  it("keeps safe styles in Basic mode but removes unsafe styles", () => {
    const result = convertHtmlToClipboardPayload(
      `<div style="color: red; position: fixed">Card</div>`,
      {
        target: "confluence",
        mode: "confluence-basic",
        licenseStatus: "free"
      }
    );

    expect(result.html).toContain("color: red");
    expect(result.html).not.toContain("position: fixed");
  });

  it("falls Pro mode back to Basic when license is free", () => {
    const result = convertHtmlToClipboardPayload(`<div class="card" style="color: red">Card</div>`, {
      target: "confluence",
      mode: "confluence-pro",
      licenseStatus: "free"
    });

    expect(result.html).toContain("color: red");
    expect(result.warnings.map((warning) => warning.code)).toContain("pro-locked");
  });

  it("normalizes dark pasted table styles to readable light styles", () => {
    const result = convertHtmlToClipboardPayload(
      `<table><tr><td style="background-color: rgb(0, 0, 0); color: rgb(20, 20, 20)">Hidden</td></tr></table>`,
      {
        target: "confluence",
        mode: "confluence-pro",
        licenseStatus: "pro"
      }
    );

    expect(result.html).toContain("background-color: #f7f8f9");
    expect(result.html).toContain("color: #172b4d");
    expect(result.text).toContain("Hidden");
  });

  it("rewrites compact report tags to visible Confluence-friendly badges", () => {
    const result = convertHtmlToClipboardPayload(
      `<span class="t t1" style="color: rgb(255, 255, 255); background-color: rgb(22, 163, 74)">트랙1 정리</span>`,
      {
        target: "confluence",
        mode: "confluence-pro",
        licenseStatus: "pro"
      }
    );

    expect(result.html).toContain("color: #166534");
    expect(result.html).toContain("background-color: #ecfdf3");
    expect(result.html).toContain("트랙1 정리");
  });
});

describe("native document planning", () => {
  it("extracts document intent from agent-style HTML", () => {
    const intent = extractDocumentIntent(`
      <h1>BDS 2.0 — 로드맵</h1>
      <div class="warning">백업 브랜치 필수</div>
      <h2>두 트랙 큰 그림</h2>
      <table>
        <tr><th>비유</th><th>트랙1</th><th>트랙2</th></tr>
        <tr><td>방</td><td>정리정돈</td><td>리모델링</td></tr>
      </table>
      <pre><code class="language-ts">const mode = "native";</code></pre>
    `);

    expect(intent.title).toBe("BDS 2.0 — 로드맵");
    expect(intent.stats.headings).toBe(2);
    expect(intent.stats.callouts).toBe(1);
    expect(intent.stats.tables).toBe(1);
    expect(intent.stats.codeBlocks).toBe(1);
    expect(intent.blocks.some((block) => block.type === "callout" && block.tone === "warning")).toBe(
      true
    );
  });

  it("creates a Confluence-native operation plan and MCP prompt", () => {
    const intent = extractDocumentIntent(`
      <h1>Release Notes</h1>
      <p>Ship the native doc workflow first.</p>
      <ul><li>Extract intent</li><li>Create Confluence plan</li></ul>
      <table><tr><th>Area</th><th>Status</th></tr><tr><td>MVP</td><td>Ready</td></tr></table>
    `);

    const plan = createConfluenceNativeDocPlan(intent);

    expect(plan.title).toBe("Release Notes");
    expect(plan.outline).toEqual(["# Release Notes"]);
    expect(plan.operations.map((operation) => operation.id)).toContain("op-document-flow");
    expect(plan.operations.map((operation) => operation.id)).toContain("op-tables");
    expect(plan.prompt).toContain("Document intent JSON");
    expect(plan.prompt).toContain("Create or update a Confluence page");
  });
});
