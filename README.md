# html-to-docs

Chrome extension for copying AI-generated HTML reports into Confluence as editable, paste-friendly document content.

The MVP is a free public release candidate with English and Korean UI. Pro conversion is represented as a locked upgrade path until licensing is implemented.

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

