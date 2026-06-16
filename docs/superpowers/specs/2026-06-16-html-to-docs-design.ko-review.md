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

`html-to-docs`는 AI agent output을 팀 문서 도구의 native/editable 문서로 옮기는 도구입니다.

제품의 핵심 구좌는 처음처럼 `선택한 서비스에 맞는 HTML/문서 output을 바로 제공하는 것`으로 유지합니다. Confluence에서는 메인 버튼이 paste-ready clipboard payload를 만들어야 합니다. 실제 테스트에서 raw HTML/CSS fidelity에는 한계가 있었으므로, 제품은 내부 plan을 보여주는 쪽이 아니라 service-aware rendering을 개선하는 방향으로 가야 합니다.

Atlassian Rovo MCP 지원은 여전히 가치가 있지만, 메인 Chrome extension flow를 대체하면 안 됩니다. Rovo MCP는 로컬/agent 환경에서 직접 Confluence create/update를 실행할 수 있을 때 쓰는 advanced path로 두고, one-click copy flow 아래의 secondary action으로 노출합니다.

첫 대상은 여전히 Confluence입니다. 다만 Notion과 Obsidian도 같은 문서 의도 모델에서 renderer만 바꿔 붙일 수 있어야 하므로, core는 Confluence-specific paste rule에 묶이면 안 됩니다.

## 제품 포지셔닝

`html-to-docs`는 AI agent output을 docs-native artifact로 바꾸는 도구입니다.

수정된 첫 버전이 해결해야 하는 순간은 다음과 같습니다.

1. 사용자가 Codex, Claude, ChatGPT 또는 다른 agent가 만든 HTML 보고서를 가지고 있습니다.
2. 보고서는 브라우저에서는 예쁘지만, Confluence에 붙여넣으면 디자인과 구조가 크게 깨집니다.
3. 사용자는 제목, 표, callout, status badge, 코드블록을 수동으로 다시 만들지 않고 editable Confluence page/section을 얻고 싶습니다.
4. 도구는 editable structure와 service-friendly styling을 최대한 보존한 Confluence-ready clipboard payload를 만듭니다.
5. Pro mode에서는 더 풍부한 target-specific normalization/preservation rule을 적용합니다.
6. 로컬 agent 환경에서 Rovo MCP를 사용할 수 있으면 secondary action으로 Confluence-native create/update workflow를 준비하거나 실행합니다.

이 제품은 pixel-perfect page importer가 아닙니다. Agent output을 service-ready documentation output으로 옮기는 bridge입니다. MCP execution은 강력한 확장 기능이지만, Chrome extension의 핵심 가치는 one-click service output입니다.

## 목표

- 현재 탭과 로컬 `.html` 파일을 입력으로 받는 Chrome extension MVP를 제공합니다.
- Agent-generated HTML report에서 Confluence-ready clipboard payload를 생성합니다.
- Target renderer의 내부 engine으로 platform-neutral document intent model을 추출합니다.
- `Copy Clean`을 무료 path로 제공합니다.
- Pro는 더 좋은 target-specific rendering과 optional local Rovo MCP execution을 제공합니다.
- 제목, 문단, 리스트, 표, 코드블록, 링크, 이미지, callout의 편집 가능성을 보존합니다.
- 나중에 Notion, Obsidian, 기타 문서 도구를 지원할 수 있는 renderer architecture를 만듭니다.
- Free와 Pro를 target rendering 품질과 optional workflow capability 기준으로 분리합니다.
- MVP부터 extension UI를 영어와 한국어로 제공합니다.

## 비목표

- pixel-perfect HTML/CSS fidelity를 약속하지 않습니다.
- document planning detail을 Chrome extension의 primary experience로 노출하지 않습니다.
- 무료 fallback path에서는 Confluence 인증을 요구하지 않습니다.
- 이미지 캡처를 기본 output path로 사용하지 않습니다.
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

초기 extension skeleton은 이미 존재하지만, 다음 구현 단계에서는 더 이상의 paste-fidelity 개선보다 document intent architecture로 리팩터링하는 것을 우선합니다.

## 아키텍처

### Chrome Extension

`apps/extension`은 Chrome Manifest V3 기반 extension입니다.

책임:

- compact popup UI를 보여줍니다.
- 현재 탭을 감지합니다.
- 로컬 `.html` 파일 선택을 지원합니다.
- target을 선택하게 합니다. 초기 target은 Confluence입니다.
- 선택된 HTML source를 converter package에 전달해 document intent model을 추출합니다.
- `Copy Clean` fallback으로 보수적인 clipboard output을 제공합니다.
- 더 풍부한 service-ready clipboard conversion을 위한 Pro Confluence output을 제공합니다.
- Local Rovo MCP preview/execution은 secondary advanced action으로 제공합니다.
- 간결한 성공/실패 상태를 보여줍니다.
- licensing 구현 전까지 Pro/MCP workflow를 locked, preview, 또는 mock-gated capability로 노출합니다.
- 사용자에게 보이는 모든 extension UI string을 영어와 한국어로 localize합니다.

Extension은 document intelligence layer가 되면 안 됩니다. Extension은 browser permission, source collection, clipboard UX, handoff UX를 담당하고, 추출/렌더링 규칙은 `packages/converter`에 둡니다.

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

- platform-neutral document intent model
- `Copy Clean` clipboard payload
- Confluence-native body와 MCP-ready action payload
- 모호하거나 단순화된 content에 대한 warning

초기 책임:

- 위험하거나 지저분한 HTML sanitize/parse
- 문서 구조 식별
- callout, status label, card, table, code block 같은 report component 분류
- Confluence fallback paste용 렌더링
- MCP-ready Confluence creation/update instruction 렌더링

Package 내부는 core extraction과 target adapter로 나뉘어야 합니다. Confluence-specific behavior가 영구적인 core model이 되면 안 됩니다.

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

Converter는 먼저 document intent를 추출하고, 그 intent를 target별로 렌더링합니다.

### Document Intent Model

모델은 브라우저가 어떻게 그렸는지가 아니라, 보고서가 무엇을 의미하는지를 표현해야 합니다.

초기 block type:

- document title
- section
- paragraph
- ordered/unordered list
- table
- code block
- inline code
- tone이 있는 callout
- tone이 있는 status badge/label
- card 또는 phase block
- quote
- 안전한 image reference

모델은 hierarchy, ordering, text, link, table structure, code, semantic emphasis를 보존합니다. 색상은 raw CSS가 아니라 intent/tone으로 표현합니다.

### Sanitization

엔진은 extraction 전에 문서에 부적합하거나 위험한 content를 제거하거나 무시해야 합니다.

- `script`
- unsafe event handler
- tracking pixel
- form
- unsupported iframe
- external behavior dependency
- browser layout에서만 의미 있는 style

### Target Rendering

같은 모델은 여러 target renderer를 지원해야 합니다.

Confluence `Copy Clean` renderer:

- 읽기 좋은 `text/html`과 `text/plain`
- 보수적인 table, heading, list, code block, callout
- visual fidelity를 약속하지 않음

Confluence local Rovo MCP renderer:

- Atlassian MCP access가 있는 agent를 위한 execution payload
- target page title, parent/page selection hint, structured block
- callout/status/table/code intent를 Confluence-native capability로 매핑
- write 전에 update/create safety checklist 제공

Future renderer:

- Notion block renderer
- Obsidian Markdown + safe HTML renderer
- 수요가 있으면 Google Docs 또는 Slack Canvas renderer

### Free Mode

Free mode는 신뢰성과 보수성을 우선합니다.

해야 할 일:

- document intent를 로컬에서 추출
- `Copy Clean` clipboard output 생성
- 핵심 semantic structure 보존
- 복잡한 layout 단순화
- 좋은 plain-text fallback 생성
- native document가 아니라 fallback output임을 설명

Free mode는 가치를 보여주는 경로입니다. 수동 정리 시간을 줄여야 하지만, high-fidelity design preservation으로 마케팅하면 안 됩니다.

### Pro / Native Doc Mode

Pro의 기본 click path는 단순해야 합니다. 선택한 target에 가장 잘 맞는 service-ready output을 생성하는 것이 본체입니다. Native/Rovo MCP 기능은 Atlassian tool을 직접 호출할 수 있는 agent 환경에서 쓰는 advanced extension입니다.

해야 할 일:

- Free보다 더 풍부한 Confluence-ready clipboard output 생성
- callout/status/table/code intent를 target-aware HTML/markdown rule로 가능한 한 보존
- 가능한 경우 secondary action으로 local Rovo MCP preview/action path 노출
- 일반 copy flow 밖에서 직접 tool execution에 사용할 Atlassian MCP action payload 준비
- 사용자가 MCP를 연결했고 action을 확인하면 Confluence page create/update까지 지원

Pro는 먼저 `better service-ready conversion`으로 마케팅합니다. `Native Doc Mode` 또는 `Agent-to-Docs Workflow`는 primary Chrome extension action이 아니라 advanced feature입니다.

## UX

Popup은 dashboard가 아니라 task-oriented UI여야 합니다.

Primary action:

- `Copy Clean`
- `Copy for Confluence`
- `Open HTML file`

Secondary state:

- current tab detected
- local file selected
- fallback/native mode indicator
- 가능한 경우 local Rovo MCP preview/action
- Pro rendering 또는 MCP workflow가 locked 상태일 때 upgrade link
- extraction/rendering 후 concise warning

Copy fallback 성공 메시지:

> Copied. Paste into the Confluence editor.

Local Rovo MCP preview 성공 메시지:

> Local Rovo MCP payload prepared. Review before writing to Confluence.

실패 메시지는 행동 가능해야 합니다.

- Chrome permission 때문에 page를 읽을 수 없음
- 이 extension에 local file access가 꺼져 있음
- HTML이 너무 커서 변환할 수 없음
- 일부 unsupported element가 제거됨
- Clipboard write 실패
- Atlassian MCP가 연결되어 있지 않음
- target Confluence page를 찾을 수 없음
- native document generation은 write 전 user review가 필요함

Extension은 사용자가 converter internals를 이해하지 않아도 되게 해야 합니다. Main path는 one button처럼, Rovo MCP path는 local/agent-powered advanced action처럼 느껴져야 합니다.

사용자에게 보이는 extension UI는 영어와 한국어를 기본 제공해야 합니다. 제품은 browser locale을 자동으로 따르고, 필요하면 나중에 settings에서 수동 language override를 추가합니다.

## 수익화

MVP는 내부 prototype이 아니라, 무료로 상용 배포 가능한 첫 공개 버전으로 간주합니다. 사용자는 결제 없이 설치해서 Free feature set을 사용할 수 있어야 합니다.

MVP에서 Pro rendering과 Rovo MCP execution은 preview upgrade path로 보여줄 수 있지만, production billing에 의존하면 안 됩니다. 실제 checkout, account management, license enforcement는 이후 licensing phase에서 다룹니다. 그 전까지 Pro는 disabled control, waitlist/upgrade link, 또는 개발용 mock license flag로 표현할 수 있습니다.

첫 paywall은 더 풍부한 target-specific conversion입니다. Rovo MCP execution은 direct service output이 충분히 좋아진 뒤 상위 plan workflow feature로 키웁니다.

Free:

- Copy Clean fallback
- current tab input
- local HTML input
- local document intent extraction
- conservative semantic clipboard conversion

Pro:

- 더 풍부한 Confluence-ready clipboard conversion
- service-specific rendering rule
- local Rovo MCP preview/action payload generation
- MCP가 있을 때 guided Confluence create/update flow
- 더 풍부한 document intent inspection
- ambiguous block과 target limitation에 대한 warning

향후 상위 tier:

- agent output folder watching
- conversion history
- batch export
- team preset
- shared style template
- organization default
- local-processing policy control
- 여러 documentation tool을 위한 approved target adapter

Chrome Web Store payments를 기본 billing system으로 가정하지 않습니다. Extension은 나중에 external checkout과 license API를 사용해야 합니다. Stripe, Paddle, Lemon Squeezy, Gumroad, ExtensionPay는 implementation planning 단계에서 평가합니다.

## 테스트 전략

가장 큰 제품 리스크는 실제 target tool에서 service-ready output이 충분히 쓸 만한가입니다. Document intent와 Rovo MCP 지원은 중요하지만, Chrome extension experience를 지배하기보다 one-click output을 개선해야 합니다.

Converter test:

- fixture HTML input
- document intent model snapshot
- Copy Clean output snapshot
- Pro service-ready clipboard snapshot
- Confluence native body/action snapshot
- text fallback snapshot
- warning/error snapshot
- hostile HTML sanitizer test

Extension test:

- current tab extraction
- local file reading
- clipboard payload creation
- local Rovo MCP preview UI
- MCP connection unavailable state
- permission failure
- large input failure
- mode selection

수동/반자동 QA:

- 대표 agent report fixture set 유지
- source HTML, extracted document intent, Copy Clean output, Pro clipboard output, local Rovo MCP plan을 비교
- Copy Clean은 각 fixture를 Confluence test page에 paste하고 limitation 기록
- Pro는 각 fixture를 Confluence test page에 paste하고 service-ready output이 의미 있게 좋아졌는지 기록
- Rovo MCP는 MCP 또는 mocked MCP payload로 test Confluence page를 create/update하고 결과 구조 리뷰
- 결과를 extraction과 target renderer rule에 다시 반영

첫 QA checklist는 다음을 확인합니다.

- section hierarchy가 읽기 쉬움
- heading과 paragraph가 편집 가능함
- table이 편집 가능함
- code block이 읽기 쉬움
- callout/card/status label이 알아볼 수 있음
- plain-text fallback이 허용 가능한 수준임
- local Rovo MCP outline이 source intent와 맞음
- target write operation이 실행 전 review됨

## Roadmap

### Phase 1: Current Extension Skeleton

- monorepo scaffold
- Chrome extension shell 생성
- converter package shell 생성
- current tab HTML extraction 지원
- local `.html` input 지원
- Copy Clean과 Pro preview experiment 구현
- clipboard payload write
- initial converter fixture 추가

### Phase 2: Document Intent Refactor

- document intent model type 도입
- converter를 extraction과 target renderer로 분리
- `copy-clean` renderer 생성
- Pro Confluence clipboard renderer 생성
- Confluence native body/action renderer 생성
- 현재 clipboard behavior는 extension의 primary path로 유지
- model snapshot test 추가

### Phase 3: Local Rovo MCP Execution Path

- 가능한 경우 Atlassian MCP/Rovo workflow 가용 여부 감지
- Confluence create/update용 MCP-ready action 생성
- review-before-write UX 추가
- title, parent/page hint, page update safety 지원
- MCP limitation과 user confirmation requirement 문서화

### Phase 4: Confluence Quality

- real agent report로 fixture library 확장
- sanitizer 강화
- callout, status label, table, code block, section extraction 개선
- native Confluence QA checklist 작성
- 알려진 Confluence paste/MCP limitation 문서화

### Phase 5: Licensing

- billing provider 선택
- account/checkout flow 추가
- license API 추가
- Pro rendering과 optional Rovo MCP workflow unlock
- license status용 extension settings 추가

### Phase 6: Additional Targets

- Notion output mode 추가
- Obsidian output mode 추가
- target-specific native block과 markdown/HTML tradeoff 재검토

### Phase 7: Workflow And Team Features

- agent output folder watching
- conversion history
- batch export
- team preset
- shared template
- organization default

## Implementation Planning 때 결정할 것

- Extension popup frontend stack: plain TypeScript, React, 또는 다른 lightweight UI layer?
- Package manager와 monorepo tool은 무엇을 쓸 것인가?
- 첫 document intent model schema는 무엇을 포함해야 하는가?
- Extractor test는 Node HTML parser, browser DOM environment, 또는 둘 다에서 돌릴 것인가?
- 초기 Atlassian MCP handoff format은 어떤 형태여야 하는가?
- Chrome extension licensing에 가장 잘 맞는 billing provider는 무엇인가?
- 첫 representative agent report fixture set은 무엇인가?
- 사용자가 settings에서 UI language를 직접 override할 수 있어야 하는가, 아니면 MVP에서는 browser locale만 따를 것인가?

## 승인 내용

이 설계는 2026-06-16 대화에서 다음 방향으로 승인되었습니다.

- Chrome extension으로 시작
- Confluence 우선
- one-click service-ready output을 primary Chrome extension promise로 유지
- Free는 Copy Clean과 local intent extraction 제공
- Pro는 더 풍부한 target-specific conversion 제공
- Rovo MCP/native workflow는 advanced local/agent-powered option으로 유지
- platform-neutral document intent model로 multi-target future 보존
- 제품은 별도 `html-to-docs` project로 유지
- extension UI 기본 언어로 영어와 한국어를 포함
