# Chrome Web Store Listing

## Product Details

### Name

html-to-docs

### Summary

Copy browser or local HTML reports as editable document content.

### Detailed Description

html-to-docs helps people move HTML reports from a browser tab or local file into a document editor as editable content.

It is designed for reports created by AI agents, internal tools, dashboards, and local HTML exports. Open the extension, choose the current tab or a local HTML file, then copy the converted content to your clipboard.

Key features:

- Copy the current browser tab as document-friendly HTML.
- Open a local `.html` file and copy it through the same flow.
- Preserve useful document structure such as headings, paragraphs, lists, tables, links, and simple emphasis.
- Keep conversion local in the browser. The extension does not send page HTML to a server.
- Use a focused popup UI with no account, payment, or setup required.

Current limitations:

- Complex CSS, scripts, interactive widgets, and highly custom layouts may be simplified by the target editor.
- Direct publishing is not enabled yet. The Publish pilot section is shown as a preparation state.

## Korean Listing Copy

### Name

html-to-docs

### Summary

브라우저 또는 로컬 HTML 보고서를 편집 가능한 문서 콘텐츠로 복사합니다.

### Detailed Description

html-to-docs는 브라우저 탭이나 로컬 HTML 파일의 보고서를 문서 편집기에서 다시 편집할 수 있는 콘텐츠로 옮기는 Chrome 확장 프로그램입니다.

AI agent가 만든 HTML 보고서, 내부 도구의 export 파일, 브라우저에서 열린 문서형 페이지를 복사하는 흐름에 맞춰 설계했습니다. 확장을 열고 현재 탭 또는 로컬 HTML 파일을 선택한 뒤, 변환된 콘텐츠를 클립보드에 복사하면 됩니다.

주요 기능:

- 현재 브라우저 탭을 문서 친화적인 HTML로 복사합니다.
- 로컬 `.html` 파일을 열어 같은 방식으로 복사합니다.
- 제목, 문단, 목록, 표, 링크, 간단한 강조 구조를 가능한 편집 가능한 형태로 유지합니다.
- 변환은 브라우저 안에서 로컬로 처리합니다. 페이지 HTML을 서버로 전송하지 않습니다.
- 계정, 결제, 별도 설정 없이 사용할 수 있는 간결한 popup UI를 제공합니다.

현재 제한:

- 복잡한 CSS, 스크립트, 인터랙티브 위젯, 고도로 커스텀된 레이아웃은 대상 문서 편집기에서 단순화될 수 있습니다.
- 직접 발행 기능은 아직 제공하지 않습니다. Publish 파일럿 영역은 준비 중 상태로 표시됩니다.

## Category

Productivity

## Graphic Assets

### Store Icon

Use `apps/extension/public/icons/icon-128.png`.

### Screenshots

Use the generated 1280x800 screenshots:

- `release/store-assets/screenshots/html-to-docs-01-main.png`
- `release/store-assets/screenshots/html-to-docs-02-local-file.png`
- `release/store-assets/screenshots/html-to-docs-03-editable-output.png`

### Small Promo Tile

Use the generated 440x280 tile:

- `release/store-assets/promo/html-to-docs-small-promo.png`

## Privacy Fields

### Single Purpose

html-to-docs copies browser or local HTML reports as editable document content.

### Permission Justification

`activeTab`: Used only after the user opens the extension and clicks the copy action, so the extension can read the currently active tab.

`scripting`: Used to run a one-time script in the active tab to capture the page HTML for conversion.

`clipboardWrite`: Used to write the converted document content to the user's clipboard after the user clicks the copy action.

### Data Use

The extension processes page HTML locally in the browser. It does not collect, store, sell, or transmit user data to a server.

### Remote Code

The extension does not load remote code.

## Test Instructions

1. Load the extension and open any HTML report page.
2. Open the popup and select `Current tab`.
3. Click `Copy as document`.
4. Paste into a document editor and verify that headings, paragraphs, lists, and tables are editable.
5. Select `Local file`, choose a `.html` file, and repeat the copy flow.
6. Confirm that the Publish pilot button is disabled and does not perform an action.
