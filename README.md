# html-to-docs

Chrome extension for copying AI-generated HTML reports into Confluence as editable, service-ready content.

The MVP is a free public release candidate with English and Korean UI. The popup now focuses on one action: `Copy for Confluence`.

Paid validation should happen outside the free extension first, through a Publish Beta or team pilot for agent-assisted direct publishing to Confluence, Notion, and Obsidian. The extension keeps the user-facing surface free and simple while the converter package can continue to carry experimental renderers for later workflow testing.

## Workspace

```text
apps/extension        Chrome Manifest V3 extension
packages/converter   HTML to docs conversion engine
packages/shared      Shared types and constants
docs/superpowers     Product design specs
```

## Commands

```bash
npm install
npm run check
npm test
npm run build
```

After `npm run build`, load `apps/extension/dist` as an unpacked extension in Chrome.
