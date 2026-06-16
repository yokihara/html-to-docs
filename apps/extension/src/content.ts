import type { TabHtmlResponse } from "@html-to-docs/shared";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "HTML_TO_DOCS_CAPTURE_TAB") {
    return false;
  }

  const response: TabHtmlResponse = {
    html: document.documentElement.outerHTML,
    title: document.title
  };

  sendResponse(response);
  return true;
});

