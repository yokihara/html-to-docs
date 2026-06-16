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

export interface TabHtmlResponse {
  html?: string;
  title?: string;
  error?: string;
}

