import { describe, expect, it } from "vitest";
import { convertHtmlToClipboardPayload } from "../src";

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

  it("falls Pro mode back to Basic when license is free", () => {
    const result = convertHtmlToClipboardPayload(`<div class="card" style="color: red">Card</div>`, {
      target: "confluence",
      mode: "confluence-pro",
      licenseStatus: "free"
    });

    expect(result.html).not.toContain("color: red");
    expect(result.warnings.map((warning) => warning.code)).toContain("pro-locked");
  });
});

