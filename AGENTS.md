<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Appica UI

- Tailwind CSS v4 only. Do NOT create a `tailwind.config.js` - v4 config lives in CSS via `@theme`.
- Scan the library for class names or everything renders unstyled: `@source '../node_modules/@appica/ui-react/dist';` in the stylesheet that imports Tailwind.
- React 19 is a hard requirement. No `forwardRef` - `ref` is a plain prop.
- Import from the subpath, one component per import: `import { Button } from '@appica/ui-react/button'`.
- Never write hex colors, px radii, or duration literals. Use role-based tokens: `bg-background-muted`, `text-foreground-intense`, `border-border-strong`, `var(--radius-md)`.
- Never write hue-based utilities (`bg-gray-100`, `text-slate-600`).
- For a link styled as a button, put `buttonVariants(...)` on the `<a>` - never `<Button render={<a/>}>`.
- Put `className` overrides on the wrapper component, not on the JSX passed to `render`.
- Appica UI component index: https://appica.dev/ui/react/llms.txt
