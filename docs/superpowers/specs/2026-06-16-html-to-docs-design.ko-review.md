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

Atlassian Rovo MCP 지원은 여전히 가치가 있지만, 첫 무료 extension UI에서는 빼는 쪽으로 변경합니다. Rovo MCP는 나중에 Publish Beta 또는 팀 파일럿에서 agent가 직접 Confluence create/update를 실행하는 paid workflow로 검증합니다.

첫 대상은 여전히 Confluence입니다. 다만 Notion과 Obsidian도 같은 문서 의도 모델에서 renderer만 바꿔 붙일 수 있어야 하므로, core는 Confluence-specific paste rule에 묶이면 안 됩니다.

## 제품 포지셔닝

`html-to-docs`는 AI agent output을 docs-native artifact로 바꾸는 도구입니다.

수정된 첫 버전이 해결해야 하는 순간은 다음과 같습니다.

1. 사용자가 Codex, Claude, ChatGPT 또는 다른 agent가 만든 HTML 보고서를 가지고 있습니다.
2. 보고서는 브라우저에서는 예쁘지만, Confluence에 붙여넣으면 디자인과 구조가 크게 깨집니다.
3. 사용자는 제목, 표, callout, status badge, 코드블록을 수동으로 다시 만들지 않고 editable Confluence page/section을 얻고 싶습니다.
4. 도구는 editable structure와 service-friendly styling을 최대한 보존한 Confluence-ready clipboard payload를 만듭니다.
5. 무료 MVP는 Basic/Pro selector 없이 가장 좋은 `Copy for Confluence` action 하나만 노출합니다.
6. 로컬 agent 환경에서 Rovo MCP를 사용할 수 있으면, 이후 paid beta에서 Confluence-native create/update workflow를 준비하거나 실행합니다.

이 제품은 pixel-perfect page importer가 아닙니다. Agent output을 service-ready documentation output으로 옮기는 bridge입니다. MCP execution은 강력한 확장 기능이지만, Chrome extension의 핵심 가치는 one-click service output입니다.

## 목표

- 현재 탭과 로컬 `.html` 파일을 입력으로 받는 Chrome extension MVP를 제공합니다.
- Agent-generated HTML report에서 Confluence-ready clipboard payload를 생성합니다.
- Target renderer의 내부 engine으로 platform-neutral document intent model을 추출합니다.
- `Copy for Confluence`를 무료 공개 path로 제공합니다.
- 현재 Pro output은 Basic 대비 충분히 차별적이지 않으므로 MVP popup에서 Pro 버튼을 제거합니다.
- 제목, 문단, 리스트, 표, 코드블록, 링크, 이미지, callout의 편집 가능성을 보존합니다.
- 나중에 Notion, Obsidian, 기타 문서 도구를 지원할 수 있는 renderer architecture를 만듭니다.
- 첫 유료 검증은 extension 내부 월 구독 paywall이 아니라 Publish Beta 또는 팀 파일럿으로 진행합니다.
- MVP부터 extension UI를 영어와 한국어로 제공합니다.

## 비목표

- pixel-perfect HTML/CSS fidelity를 약속하지 않습니다.
- document planning detail을 Chrome extension의 primary experience로 노출하지 않습니다.
- 무료 fallback path에서는 Confluence 인증을 요구하지 않습니다.
- 이미지 캡처를 기본 output path로 사용하지 않습니다.
- MVP에서는 history, batch export, team preset, agent folder watching을 만들지 않습니다.
- MVP에서는 production payment system이나 in-popup Pro paywall을 구현하지 않습니다.

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
- `Copy for Confluence`로 보수적인 clipboard output을 제공합니다.
- 향후 agent-assisted direct publishing을 위한 가벼운 Publish Beta CTA를 제공합니다.
- 간결한 성공/실패 상태를 보여줍니다.
- Pro/MCP workflow experiment는 paid beta 또는 team pilot 전까지 MVP UI 밖에 둡니다.
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

Future Publish workflow renderer:

- Atlassian MCP 또는 equivalent connector access가 있는 agent를 위한 execution payload
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

### Paid Beta / Native Publish Workflow

Paid workflow는 MVP popup의 Pro toggle로 노출하지 않습니다. Atlassian, Notion, Obsidian 관련 tool을 직접 호출할 수 있는 agent 환경 사용자에게 Publish Beta 또는 team pilot으로 검증합니다.

해야 할 일:

- review 후 target service에 직접 publish
- 원본 DOM에 장식을 덧칠하지 않고 document intent에서 clean target-native content 재생성
- callout/status/table/code intent를 target-aware HTML/markdown rule로 가능한 한 보존
- 일반 copy flow 밖에서 직접 tool execution에 사용할 Atlassian MCP 또는 connector action payload 준비
- 사용자가 connector를 연결했고 action을 확인하면 Confluence page create/update 지원
- team preset, page placement, update safety 지원

유료 promise는 workflow value가 먼저입니다. 수동 정리 단계를 줄이고 더 안전하게 직접 publish하는 것이 핵심입니다. `Native Doc Mode` 또는 `Agent-to-Docs Workflow`는 primary Chrome extension action이 아니라 advanced feature입니다.

## UX

Popup은 dashboard가 아니라 task-oriented UI여야 합니다.

Primary action:

- `Copy for Confluence`
- `Open HTML file`

Secondary state:

- current tab detected
- local file selected
- Publish Beta CTA
- extraction/rendering 후 concise warning

Copy fallback 성공 메시지:

> Copied. Paste into the Confluence editor.

실패 메시지는 행동 가능해야 합니다.

- Chrome permission 때문에 page를 읽을 수 없음
- 이 extension에 local file access가 꺼져 있음
- HTML이 너무 커서 변환할 수 없음
- 일부 unsupported element가 제거됨
- Clipboard write 실패

Extension은 사용자가 converter internals를 이해하지 않아도 되게 해야 합니다. Main path는 one button처럼, Publish Beta CTA는 disabled feature가 아니라 향후 workflow invitation처럼 느껴져야 합니다.

사용자에게 보이는 extension UI는 영어와 한국어를 기본 제공해야 합니다. 제품은 browser locale을 자동으로 따르고, 필요하면 나중에 settings에서 수동 language override를 추가합니다.

## 수익화

MVP는 내부 prototype이 아니라, 무료로 상용 배포 가능한 첫 공개 버전으로 간주합니다. 사용자는 결제 없이 설치해서 Free feature set을 사용할 수 있어야 합니다.

MVP에서는 Basic/Pro selector를 보여주지 않습니다. 실제 테스트에서 Pro clipboard output이 결제할 만큼 차별적으로 보이지 않았기 때문에, 공개 extension은 무료 `Copy for Confluence` workflow에 집중합니다.

첫 유료 검증은 extension 안의 월 구독 버튼이 아니라 Publish Beta 또는 팀 파일럿으로 진행합니다. 유료 promise는 단순 paste fidelity보다 agent-assisted direct publishing, workspace-aware document creation, target adapter, team workflow 보장 쪽이 더 적합합니다.

Free:

- Copy for Confluence
- current tab input
- local HTML input
- local document intent extraction
- conservative semantic clipboard conversion
- 영어/한국어 popup UI

Paid beta / team pilot:

- Confluence, 이후 Notion/Obsidian으로 agent-assisted direct publish
- 가능한 경우 local Rovo MCP 또는 equivalent connector execution
- create/update 전 review-before-write flow
- target/page hint, parent placement, update safety
- team preset과 preferred documentation pattern
- paid pilot fixture 기반 target adapter 품질 개선
- 예쁜 clipboard output보다 수동 정리 시간을 줄이는 workflow support

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
- free Confluence clipboard output snapshot
- paid beta experiment renderer snapshot
- Confluence native body/action snapshot
- text fallback snapshot
- warning/error snapshot
- hostile HTML sanitizer test

Extension test:

- current tab extraction
- local file reading
- clipboard payload creation
- permission failure
- large input failure
- source selection
- Publish Beta CTA behavior

수동/반자동 QA:

- 대표 agent report fixture set 유지
- source HTML, extracted document intent, free Confluence clipboard output 비교
- 각 fixture를 Confluence test page에 paste하고 limitation 기록
- paid beta experiment에서는 MCP 또는 mocked execution payload로 test Confluence page를 create/update하고 결과 구조 리뷰
- 결과를 extraction과 target renderer rule에 다시 반영

첫 QA checklist는 다음을 확인합니다.

- section hierarchy가 읽기 쉬움
- heading과 paragraph가 편집 가능함
- table이 편집 가능함
- code block이 읽기 쉬움
- callout/card/status label이 알아볼 수 있음
- plain-text fallback이 허용 가능한 수준임
- paid beta experiment에서 target write operation이 실행 전 review됨

## Roadmap

### Phase 1: Current Extension Skeleton

- monorepo scaffold
- Chrome extension shell 생성
- converter package shell 생성
- current tab HTML extraction 지원
- local `.html` input 지원
- Copy for Confluence 구현
- clipboard payload write
- initial converter fixture 추가
- 무료 popup UI polish와 Publish Beta CTA 추가

### Phase 2: Document Intent Refactor

- document intent model type 도입
- converter를 extraction과 target renderer로 분리
- `copy-clean` renderer 생성
- paid beta research용 experimental Confluence renderer 유지
- agent workflow experiment용 Confluence native body/action renderer 생성
- 현재 clipboard behavior는 extension의 primary path로 유지
- model snapshot test 추가

### Phase 3: Publish Beta / Agent Workflow

- paid beta 또는 팀 파일럿 사용자 모집
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
- paid beta value가 검증된 뒤 account/checkout flow 추가
- license API 추가
- Publish workflow, team preset, optional connector execution unlock
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
- MVP popup에서 Pro 버튼 제거
- Rovo MCP/native workflow는 무료 popup 밖의 paid beta 또는 team pilot으로 유지
- subscription 추가 전 paid beta/team pilot으로 revenue 검증
- platform-neutral document intent model로 multi-target future 보존
- 제품은 별도 `html-to-docs` project로 유지
- extension UI 기본 언어로 영어와 한국어를 포함
