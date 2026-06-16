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

  it("renders unlocked Pro as clean service-ready document HTML", () => {
    const result = convertHtmlToClipboardPayload(
      `<h1>Report</h1><div class="card" style="color: red; position: fixed"><span class="badge">Ready</span></div>`,
      {
        target: "confluence",
        mode: "confluence-pro",
        licenseStatus: "pro"
      }
    );

    expect(result.html).toContain("data-html-to-docs=\"pro-rendered\"");
    expect(result.html).toContain("Report");
    expect(result.html).toContain("Ready");
    expect(result.html).toContain("service-ready Confluence output");
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

  it("renders dark pasted tables as clean light Pro tables", () => {
    const result = convertHtmlToClipboardPayload(
      `<table><tr><td style="background-color: rgb(0, 0, 0); color: rgb(20, 20, 20)">Hidden</td></tr></table>`,
      {
        target: "confluence",
        mode: "confluence-pro",
        licenseStatus: "pro"
      }
    );

    expect(result.html).toContain("background-color: #ffffff");
    expect(result.html).not.toContain("rgb(0, 0, 0)");
    expect(result.text).toContain("Hidden");
  });

  it("rewrites compact report tags to visible Confluence-friendly badges in Basic", () => {
    const result = convertHtmlToClipboardPayload(
      `<span class="t t1" style="color: rgb(255, 255, 255); background-color: rgb(22, 163, 74)">트랙1 정리</span>`,
      {
        target: "confluence",
        mode: "confluence-basic",
        licenseStatus: "free"
      }
    );

    expect(result.html).toContain("color: #166534");
    expect(result.html).toContain("background-color: #ecfdf3");
    expect(result.html).toContain("트랙1 정리");
  });

  it("adds Pro-only document polish that Basic output does not include", () => {
    const source = `
      <h1>BDS 2.0 — 로드맵</h1>
      <h2>0. 이 문서의 위치</h2>
      <p>전체 흐름을 설명합니다.</p>
      <h2>1. 두 트랙 큰 그림</h2>
      <table><tr><th>트랙</th><th>내용</th></tr><tr><td>1</td><td>정리</td></tr></table>
      <h3>Phase 0</h3>
      <pre><code>use_figma()</code></pre>
    `;
    const basic = convertHtmlToClipboardPayload(source, {
      target: "confluence",
      mode: "confluence-basic",
      licenseStatus: "free"
    });
    const pro = convertHtmlToClipboardPayload(source, {
      target: "confluence",
      mode: "confluence-pro",
      licenseStatus: "pro"
    });

    expect(basic.html).not.toContain("pro-document-map");
    expect(pro.html).toContain("pro-document-map");
    expect(pro.html).toContain("Document map");
    expect(pro.html).toContain("Sections 3");
    expect(pro.html).toContain("border-left: 4px solid #0c66e4");
    expect(pro.html.length).toBeGreaterThan(basic.html.length);
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

  it("creates a Confluence-native operation plan and MCP execution payload", () => {
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
    expect(plan.bodyMarkdown).toContain("# Release Notes");
    expect(plan.bodyMarkdown).toContain("| Area | Status |");
    expect(plan.executionPayload.tool).toBe("atlassian-rovo.createConfluencePage");
    expect(plan.executionPayload.body).toBe(plan.bodyMarkdown);
  });
});
