export type TargetPlatform = "confluence";

export type LicenseStatus = "free" | "pro" | "team";

export type ConversionMode = "confluence-basic" | "confluence-pro";

export interface ConversionOptions {
  target: TargetPlatform;
  mode: ConversionMode;
  licenseStatus: LicenseStatus;
  sourceLabel?: string;
}

export type ConversionWarningCode =
  | "removed-script"
  | "removed-style"
  | "removed-unsafe-attribute"
  | "simplified-layout"
  | "pro-locked";

export interface ConversionWarning {
  code: ConversionWarningCode;
  message: string;
}

export interface ClipboardPayload {
  html: string;
  text: string;
  warnings: ConversionWarning[];
}

export type DocumentIntentBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "code"
  | "callout"
  | "divider";

export type DocumentIntentTone = "info" | "success" | "warning" | "danger" | "neutral";

export interface DocumentIntentBlock {
  id: string;
  type: DocumentIntentBlockType;
  text?: string;
  level?: number;
  tone?: DocumentIntentTone;
  ordered?: boolean;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  language?: string;
}

export interface DocumentIntent {
  title: string;
  blocks: DocumentIntentBlock[];
  stats: {
    headings: number;
    callouts: number;
    tables: number;
    codeBlocks: number;
    lists: number;
  };
  warnings: ConversionWarning[];
}

export interface NativeDocOperation {
  id: string;
  label: string;
  description: string;
  blockIds: string[];
}

export interface NativeDocExecutionPayload {
  tool: "atlassian-rovo.createConfluencePage" | "atlassian-rovo.updateConfluencePage";
  contentFormat: "markdown";
  title: string;
  body: string;
  requiredInputs: string[];
}

export interface NativeDocPlan {
  target: TargetPlatform;
  title: string;
  summary: string;
  outline: string[];
  operations: NativeDocOperation[];
  bodyMarkdown: string;
  executionPayload: NativeDocExecutionPayload;
  intent: DocumentIntent;
}

export interface TabHtmlResponse {
  html?: string;
  title?: string;
  error?: string;
}
