# html-to-docs

Chrome extension for moving AI-generated HTML reports into Confluence as editable, docs-native content.

The MVP is a free public release candidate with English and Korean UI. Pro conversion is represented as a locked upgrade path until licensing is implemented.

Current local builds enable Pro preview so the Native Doc Plan can be tested before billing or MCP execution is connected. In Pro mode, the popup extracts document intent, previews the Confluence operation plan, and exposes the markdown body and MCP execution payload that an agent can use to call Atlassian tools directly.

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
