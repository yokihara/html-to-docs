# html-to-docs Design System

## Overview

`html-to-docs` uses a wallet-style browser extension interface: a single white shell, clear top toolbar, divided content sections, and one strong action. The reference mood is a modern extension popup rather than a SaaS card stack.

The visual system should feel clean, useful, and slightly technical without looking like an AI product. It uses a pale app background, white surfaces, thin borders, blue action accents, and restrained rounded rectangles. The UI is compact enough for a Chrome popup but still has the calm spacing of a polished wallet or account panel.

## Design Context

- **Target audience:** People who use AI agents, browser-generated reports, and internal documentation tools in daily work.
- **Use cases:** Copy a current browser tab or local HTML report into document editors as editable content; discover a future direct-publish pilot.
- **Tone:** Modern extension utility, precise, calm, and operational.

## Color Tokens

- `app-bg` `#f5f7fc`: outside popup canvas.
- `surface` `#ffffff`: main shell and primary panels.
- `surface-soft` `#f8faff`: subtle lower-priority card fill.
- `surface-blue` `#f4f7ff`: target chip fill.
- `border` `#e6e9f2`: section dividers and light borders.
- `border-strong` `#d8deeb`: controls and secondary buttons.
- `ink` `#07091d`: primary text.
- `muted` `#8b94aa`: low-emphasis text.
- `muted-strong` `#5d6678`: body text.
- `blue` `#245bff`: active and primary action accent.
- `blue-deep` `#1646df`: primary hover.
- `button-shadow` layered neutral shadow: action buttons cast a soft downward shadow; do not tint the shadow with the button color.
- `success` `#185b4b`: success status text.

## Typography

Use a Korean-first variable sans stack everywhere:

```css
"Pretendard Variable", "Pretendard-Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif
```

Use confident weights rather than thin display weights:

- Wordmark / product name: `28-32px`, `700-760`, tight letter spacing.
- Labels and buttons: `13-16px`, `680-760`.
- Body copy: `13-14px`, `430`.

## Layout

- Popup width: `420px`.
- Outer body has a pale app background and `10px` padding.
- Main shell is a white rounded panel with a thin border and subtle shadow.
- Section order:
  - top toolbar with logo only
  - account/product summary section
  - source and copy action section
  - status/warnings
  - soft publish pilot card
- Use section dividers instead of stacking many cards.

## Shape Rules

- Main shell: `22px` radius.
- Cards and promo panels: `14px`.
- Controls and buttons: `12px`.
- Avoid pill-only grammar for this product; the wallet reference uses compact rounded rectangles and clearer section rhythm.

## Components

### `topbar`

White toolbar with the logo on the left. Avoid target-platform badges in the header so the product does not feel locked to a single destination.

### `brand-mark`

Layered document/code mark used in both the popup header and Chrome extension icons. The mark should remain readable at `16px`, so keep the shapes bold, the outline high-contrast, and the code glyph simple.

### `account`

Product summary area with eyebrow, product name, and one compact explanation line.

### `source-panel`

The operational area. Contains source selector, custom local file picker, and the primary copy button. Native browser file input controls should be visually hidden behind the product's own compact file button and filename label.

### `source-toggle`

Two equally weighted rounded controls. Active state uses blue text, a light blue border, and the shared neutral drop shadow; do not use an inset underline.

### `button-primary`

Filled blue rounded rectangle. Only used for the primary copy action.

### `pilot-card`

Soft card at the bottom. It should be visibly secondary and should never compete with the copy action.

## Do

- Use dividers and white space to create hierarchy.
- Keep only one strong action.
- Use blue for action and active states.
- Keep the pilot card quiet.
- Keep Korean text in Pretendard.

## Do Not

- Do not use heavy green cards as the main visual identity.
- Do not use generic SaaS gradients or glow.
- Do not make the popup look like a landing page.
- Do not make every surface a separate raised card.
- Do not use thin Latin-display typography for Korean-heavy UI.
