---
title: html-to-docs design Korean review companion
date: 2026-06-16
status: review-companion
source: 2026-06-16-html-to-docs-design.md
tags:
  - chrome-extension
  - confluence
  - html-conversion
  - agent-output
  - korean-review
---

# html-to-docs 설계 한글 리뷰본

이 문서는 [2026-06-16-html-to-docs-design.md](./2026-06-16-html-to-docs-design.md)를 리뷰하기 위한 한글 companion입니다.

영문 설계 문서가 source of truth입니다. 이 파일은 피드백과 논의를 쉽게 하기 위한 번역/해설본이며, 구현 기준은 영문 문서를 따릅니다.

## 요약

`html-to-docs`는 AI agent가 만든 HTML 보고서를 팀 문서 도구로 옮기는 Chrome extension입니다. 핵심 목표는 원본 보고서의 편집 가능성과 시각적 계층을 함께 살리는 것입니다.

첫 대상은 Confluence입니다. Notion과 Obsidian은 후속 대상이지만, MVP 품질 기준은 Confluence로 잡습니다. 초기 제품은 clipboard-first 방식입니다. 사용자는 extension에서 변환된 `text/html`을 복사하고 Confluence 편집기에 붙여넣습니다.

이 제품은 browser extension 패키징, HTML 변환 엔진, 라이선스, 향후 agent workflow와 team 기능까지 독립적인 제품 경계를 가지므로 별도 repository로 시작합니다.

## 제품 포지셔닝

`html-to-docs`는 AI agent output을 team docs로 옮기는 도구입니다.

첫 버전이 해결해야 하는 순간은 다음과 같습니다.

1. 사용자가 Codex, Claude, ChatGPT 또는 다른 agent가 만든 HTML 보고서를 가지고 있습니다.
2. 그 보고서는 브라우저에서 보기 좋게 렌더링됩니다.
3. 사용자는 제목, 표, callout, 카드, badge, 색상, 코드블록을 수동으로 다시 만들지 않고 Confluence로 옮기고 싶습니다.
4. 사용자는 Chrome extension에서 `Copy for Confluence`를 누릅니다.
5. 변환된 콘텐츠가 `text/html`과 `text/plain` 형태로 clipboard에 복사됩니다.
6. 사용자는 Confluence page에 붙여넣고, 원본의 정보 계층과 디자인 언어가 어느 정도 유지된 편집 가능한 문서를 얻습니다.

이 제품은 pixel-perfect importer가 아닙니다. 브라우저에서 보이는 HTML 보고서를 편집 가능한 문서로 옮기는 실용적인 bridge입니다.

## 목표

- 현재 탭과 로컬 `.html` 파일을 입력으로 받는 Chrome extension MVP를 제공합니다.
- Confluence에 붙여넣기 좋은 clipboard content를 생성합니다.
- 제목, 문단, 리스트, 표, 코드블록, 링크, 이미지, callout의 편집 가능성을 보존합니다.
- 보고서가 의도적으로 디자인된 느낌을 유지할 만큼의 시각적 스타일을 보존합니다.
- 나중에 Notion, Obsidian, 기타 문서 도구를 지원할 수 있는 변환 엔진을 만듭니다.
- Free와 Pro mode를 변환 품질 기준으로 분리합니다.
- MVP부터 extension UI를 영어와 한국어로 제공합니다.

## 비목표

- MVP에서는 Confluence REST API로 page를 직접 생성하지 않습니다.
- MVP에서는 Confluence 인증을 요구하지 않습니다.
- 이미지 캡처를 기본 output path로 사용하지 않습니다.
- pixel-perfect 보존을 목표로 하지 않습니다.
- MVP에서는 history, batch export, team preset, agent folder watching을 만들지 않습니다.
- MVP에서는 production payment system을 구현하지 않습니다. 다만 license boundary는 인터페이스로 남겨둡니다.

## Repository 구조

제품은 새 repository에 둡니다.

```text
html-to-docs/
  apps/
    extension/
  packages/
    converter/
    shared/
  docs/
    superpowers/
      specs/
```

현재 단계에서는 설계 문서만 존재합니다. 구현은 별도의 implementation plan을 작성한 뒤 시작합니다.

## 아키텍처

### Chrome Extension

`apps/extension`은 Chrome Manifest V3 기반 extension입니다.

책임:

- compact popup UI를 보여줍니다.
- 현재 탭을 감지합니다.
- 로컬 `.html` 파일 선택을 지원합니다.
- target을 선택하게 합니다. 초기 target은 Confluence입니다.
- 선택된 HTML source와 license mode를 converter package에 전달합니다.
- 변환 결과를 `text/html`과 `text/plain`으로 clipboard에 씁니다.
- 간결한 성공/실패 상태를 보여줍니다.
- licensing 구현 전까지 Pro conversion을 locked 또는 mock-gated capability로 노출합니다.
- 사용자에게 보이는 모든 extension UI string을 영어와 한국어로 localize합니다.

Extension은 변환 엔진이 되면 안 됩니다. Extension은 browser permission, source collection, clipboard UX를 담당하고, 변환 규칙은 `packages/converter`에 둡니다.

### Internationalization

MVP는 영어와 한국어 UI를 포함해야 합니다.

Extension은 Chrome의 표준 i18n 구조를 사용합니다.

```text
apps/extension/
  _locales/
    en/
      messages.json
    ko/
      messages.json
```

Extension manifest, popup UI, settings UI, error message, warning message, upgrade copy는 hard-coded string이 아니라 localization key를 사용해야 합니다. 기본 locale은 영어입니다.

Converter는 사용자가 제공한 HTML content를 번역하면 안 됩니다. Converter는 source document의 구조와 style을 보존/변환할 뿐입니다. Localization은 제품 UI와 system message에만 적용하고, report content에는 적용하지 않습니다.

### Content Script

Content script는 popup이 변환을 요청할 때 현재 탭 DOM을 읽습니다.

책임:

- 관련 document HTML을 캡처합니다.
- 가능하면 raw page source보다 rendered DOM을 우선합니다.
- extension UI와 browser-only artifact를 제외합니다.
- serialize된 HTML snapshot을 extension runtime으로 반환합니다.

Content script는 Chrome permission, restricted scheme, sandboxing, local file setting 때문에 page를 읽을 수 없을 때 행동 가능한 error를 보고해야 합니다.

### Converter Package

`packages/converter`는 제품의 핵심 자산입니다.

입력:

- raw HTML string
- 또는 serialized DOM snapshot

출력:

- `text/html` clipboard payload
- `text/plain` fallback
- 제거되거나 단순화된 content에 대한 warning

초기 mode:

- `confluence-basic`
- `confluence-pro`

Basic mode는 안정적인 paste behavior를 우선합니다. Pro mode는 더 나은 report design preservation으로 paid product를 차별화합니다.

### Shared Package

`packages/shared`는 package 간 공유 type과 constant를 담습니다.

예시:

- target platform identifier
- conversion mode identifier
- license status
- conversion option
- warning/error code
- 나중에 telemetry를 추가할 경우 telemetry event name

MVP에서는 mock license provider를 사용할 수 있지만, 인터페이스는 이미 `free`, `pro`, `team` 상태를 모델링해야 합니다.

## 변환 전략

Converter는 HTML을 Confluence editor가 paste로 받아들이기 좋은 형태로 normalize합니다.

엔진은 문서에 부적합하거나 위험한 content를 제거하거나 무시해야 합니다.

- `script`
- unsafe event handler
- tracking pixel
- form
- unsupported iframe
- external behavior dependency
- paste나 editing을 깨뜨릴 가능성이 높은 style

엔진은 semantic content를 보존해야 합니다.

- heading
- paragraph
- link
- ordered/unordered list
- table
- blockquote
- code block
- inline code
- 안전하고 지원 가능한 image

Converter는 흔한 report UI pattern을 paste-friendly equivalent로 바꿔야 합니다.

- card는 bordered content block으로 변환합니다.
- badge는 inline pill span으로 변환합니다.
- callout은 colored blockquote 또는 bordered block으로 변환합니다.
- code panel은 `pre > code`로 변환합니다.
- table header는 유용한 background와 weight를 유지합니다.
- grid/flex layout은 필요할 때 읽기 좋은 vertical section으로 펼칩니다.

### Basic Mode

Basic mode는 신뢰성과 보수성을 우선합니다.

해야 할 일:

- unsafe 또는 unsupported element 제거
- 핵심 semantic structure 보존
- 복잡한 layout 단순화
- 좋은 plain-text fallback 생성
- 깨지기 쉬운 inline styling 회피

Basic mode는 무료 사용자에게 가치를 보여주는 경로입니다. 사용자가 제품을 신뢰할 만큼 충분히 잘 작동해야 합니다.

### Pro Mode

Pro mode는 report design을 더 적극적으로 보존합니다.

Target paste behavior가 안정적인 경우, 다음 inline style allowlist를 우선 보존합니다.

- `color`
- `background-color`
- `border`
- `border-radius`
- `padding`
- `margin`
- `font-weight`
- `font-style`
- `text-align`
- `width`
- `max-width`
- `vertical-align`

깨진 paste 결과를 만들 가능성이 높은 style은 피해야 합니다.

- complex positioning
- animation
- transform
- viewport-sized fixed layout
- external font dependency
- Confluence가 보존하지 못하는 unsupported grid/flex behavior

Pro mode는 exact cloning이 아니라 `Preserve report design`으로 마케팅해야 합니다.

## UX

Popup은 dashboard가 아니라 task-oriented UI여야 합니다.

Primary action:

- `Copy for Confluence`
- `Open HTML file`

Secondary state:

- current tab detected
- local file selected
- Basic/Pro mode indicator
- Pro가 locked 상태일 때 upgrade link
- conversion 후 concise warning

성공 메시지:

> Copied. Paste into the Confluence editor.

실패 메시지는 행동 가능해야 합니다.

- Chrome permission 때문에 page를 읽을 수 없음
- 이 extension에 local file access가 꺼져 있음
- HTML이 너무 커서 변환할 수 없음
- 일부 unsupported element가 제거됨
- Clipboard write 실패

Extension은 사용자가 converter internals를 이해하지 않아도 되게 해야 합니다. 일반 흐름은 one button처럼 느껴져야 합니다.

사용자에게 보이는 extension UI는 영어와 한국어를 기본 제공해야 합니다. 제품은 browser locale을 자동으로 따르고, 필요하면 나중에 settings에서 수동 language override를 추가합니다.

## 수익화

MVP는 내부 prototype이 아니라, 무료로 상용 배포 가능한 첫 공개 버전으로 간주합니다. 사용자는 결제 없이 설치해서 Free feature set을 사용할 수 있어야 합니다.

MVP에서 Pro는 locked upgrade path로 보여줄 수 있지만, production billing에 의존하면 안 됩니다. 실제 checkout, account management, license enforcement는 이후 licensing phase에서 다룹니다. 그 전까지 Pro는 disabled control, waitlist/upgrade link, 또는 개발용 mock license flag로 표현할 수 있습니다.

첫 paywall은 conversion quality입니다.

Free:

- Basic Confluence copy
- current tab input
- local HTML input
- conservative semantic conversion

Pro:

- 더 강한 design preservation
- card, badge, callout, table, code block, color, spacing preservation
- 더 나은 plain-text fallback
- 무엇이 바뀌었는지 설명하는 warning

향후 상위 tier:

- agent output folder watching
- conversion history
- batch export
- team preset
- shared style template
- organization default
- local-processing policy control

Chrome Web Store payments를 기본 billing system으로 가정하지 않습니다. Extension은 나중에 external checkout과 license API를 사용해야 합니다. Stripe, Paddle, Lemon Squeezy, Gumroad, ExtensionPay는 implementation planning 단계에서 평가합니다.

## 테스트 전략

가장 큰 제품 리스크는 실제 Confluence paste behavior입니다. 테스트는 converter correctness와 실제 paste outcome을 모두 다뤄야 합니다.

Converter test:

- fixture HTML input
- Basic output snapshot
- Pro output snapshot
- text fallback snapshot
- warning/error snapshot
- hostile HTML sanitizer test

Extension test:

- current tab extraction
- local file reading
- clipboard payload creation
- permission failure
- large input failure
- mode selection

수동/반자동 QA:

- 대표 agent report fixture set 유지
- 각 fixture를 Confluence test page에 paste
- screenshot과 checklist 결과 기록
- Confluence가 style을 strip하는 위치 기록
- 결과를 converter rule에 다시 반영

첫 QA checklist는 다음을 확인합니다.

- text overlap 없음
- section hierarchy가 읽기 쉬움
- heading과 paragraph가 편집 가능함
- table이 편집 가능함
- code block이 읽기 쉬움
- callout/card/badge가 알아볼 수 있음
- plain-text fallback이 허용 가능한 수준임

## Roadmap

### Phase 1: MVP Skeleton

- monorepo scaffold
- Chrome extension shell 생성
- converter package shell 생성
- current tab HTML extraction 지원
- local `.html` input 지원
- Basic/Pro mode interface 구현
- clipboard payload write
- initial converter fixture 추가

### Phase 2: Confluence Quality

- real agent report로 fixture library 확장
- sanitizer 강화
- card, badge, callout, table, code block conversion 개선
- manual Confluence paste checklist 작성
- 알려진 Confluence paste limitation 문서화

### Phase 3: Licensing

- billing provider 선택
- account/checkout flow 추가
- license API 추가
- Pro mode unlock
- license status용 extension settings 추가

### Phase 4: Additional Targets

- Notion output mode 추가
- Obsidian output mode 추가
- target-specific styling과 markdown/HTML tradeoff 재검토

### Phase 5: Workflow And Team Features

- agent output folder watching
- conversion history
- batch export
- team preset
- shared template
- organization default

## Implementation Planning 때 결정할 것

- Extension popup frontend stack: plain TypeScript, React, 또는 다른 lightweight UI layer?
- Package manager와 monorepo tool은 무엇을 쓸 것인가?
- Converter test는 Node HTML parser, browser DOM environment, 또는 둘 다에서 돌릴 것인가?
- Chrome extension licensing에 가장 잘 맞는 billing provider는 무엇인가?
- 첫 representative agent report fixture set은 무엇인가?
- 사용자가 settings에서 UI language를 직접 override할 수 있어야 하는가, 아니면 MVP에서는 browser locale만 따를 것인가?

## 승인 내용

이 설계는 2026-06-16 대화에서 다음 방향으로 승인되었습니다.

- Chrome extension으로 시작
- Confluence 우선
- editability와 visual preservation의 균형
- Free는 basic conversion 제공
- Pro는 더 높은 design preservation quality를 첫 paywall로 사용
- agent workflow와 team preset은 상위 tier로 보류
- 제품은 별도 `html-to-docs` project로 유지
- extension UI 기본 언어로 영어와 한국어를 포함
