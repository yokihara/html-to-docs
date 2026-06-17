# html-to-docs Design System

## Overview

`html-to-docs` uses a compact transactional design system for browser extension surfaces. The product is not a cinematic marketing site; it is a small utility that should feel precise, editorial, and trustworthy while users move browser HTML into documentation tools.

The system borrows the discipline of a two-canvas commerce UI without copying any one brand. The extension popup lives on a light/cream canvas, uses black ink as the primary action color, and reserves soft green fills for workflow progress or pilot surfaces. Buttons are always pills. Cards can use modest rounded corners, but buttons, chips, and segmented controls must share one pill vocabulary.

## Design Context

- **Target audience:** People who use AI agents, browser-generated reports, and internal documentation tools in daily work.
- **Use cases:** Copy a current browser tab or local HTML report into Confluence as editable content; discover a future direct-publish pilot.
- **Tone:** Transactional, editorial, calm, and compact. It should feel more like a serious document utility than an AI demo.

## Color Tokens

- `canvas-cream` `#fcfcf4`: popup page background.
- `canvas-light` `#fffef9`: card and selected-control surface.
- `surface-mint` `#c8f5d0`: high-signal green accent for hover or future featured states.
- `surface-mint-soft` `#edf9ed`: low-signal green control background.
- `surface-pistachio` `#ddf5dc`: pilot/workflow band fill.
- `hairline` `#e3e1d7`: default light divider.
- `hairline-strong` `#bfcbbd`: stronger control border.
- `ink` `#10100e`: primary text and filled button color.
- `shade-40` `#989892`, `shade-50` `#686861`, `shade-60` `#4b4b45`: secondary text ladder.
- `success-ink` `#164c3f`: success status text.

## Typography

Display typography uses a thin grotesk stack:

```css
"Neue Haas Grotesk Display", "Helvetica Now Display", "Helvetica Neue", Arial, sans-serif
```

Use thin weights around `330` for the wordmark and any display moment. UI body, labels, buttons, and captions use:

```css
"Inter Variable", Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Apply `font-feature-settings: "ss03"` globally when the font supports it.

## Layout

- Base spacing follows an 8px rhythm with 4px fine steps.
- Popup width is `390px`.
- The popup uses one compact vertical stack:
  - masthead
  - intro copy
  - source panel
  - primary copy action
  - status/warnings
  - pilot band
- Cards use `12px` radius and light hairline borders.
- Avoid nested cards and ornamental shadows. Use a small stacked paper shadow only for the main source panel.

## Shape Rules

- Buttons: always pill, `9999px`.
- Chips and target tags: always pill.
- Segmented controls: pill shell with pill active state.
- Cards and panels: `12px`.
- Inputs and file wells: `8px`.

## Components

### `brand-mark`

Small document/code mark. It should stay compact and functional, not mascot-like.

### `target-pill`

Outlined pill showing the current target, initially `Confluence`.

### `source-panel`

Light card with a pill segmented control for `Current tab` and `Local file`. It is the only elevated panel in the popup.

### `button-primary-pill`

Filled black pill. Used only for the main `Copy for Confluence` action.

### `button-outline-pill`

White pill with black border. Used for secondary actions such as joining the publish pilot.

### `pilot-band`

Pistachio-filled workflow band. It is softer than the primary action and should never compete visually with the copy button.

## Do

- Keep the popup on light/cream canvases.
- Use black ink for the dominant CTA.
- Use green as a surface fill, not a text gimmick.
- Keep one primary action visible.
- Keep labels short and operational.

## Do Not

- Do not use blue/purple AI gradients.
- Do not use rounded-rectangle buttons.
- Do not make every section a card.
- Do not add decorative blobs, glow, glass, or heavy shadows.
- Do not turn the publish pilot into the primary action.
