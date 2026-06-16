# html-to-docs

Chrome extension for copying AI-generated HTML reports into Confluence as editable, service-ready content.

The MVP is a free public release candidate with English and Korean UI. Pro conversion is represented as a locked upgrade path until licensing is implemented.

Current local builds enable Pro conversion so richer Confluence-ready clipboard output can be tested before billing is connected. Pro rebuilds the source from document intent into clean service-ready HTML, including an auto document map, stronger section treatment, table headers, and code block styling. The popup also exposes a secondary local Rovo MCP preview that an agent can use to call Atlassian tools directly.

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
