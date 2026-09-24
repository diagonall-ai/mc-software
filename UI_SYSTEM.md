# UI System Guide

This file defines how UI should be built in this repository.

Use the existing shadcn setup. Do not invent a parallel component system.

## Registry and source of truth

This repo uses the shadcn registry config in `components.json`.

Important settings:

- style: `base-vega` (Base UI primitives, Vega look)
- icons: `lucide`
- css file: `app/app.css`
- aliases:
  - `~/components`
  - `~/components/ui`
  - `~/lib/utils`

The global token system lives in `app/app.css`. New UI work should consume those tokens through Tailwind utilities and CSS variables, not by inventing ad hoc color values.

## Brand: Mobile Club

The theme in `app/app.css` is Mobile Club's brand ("energetic minimalism"): a warm cream canvas, black text, and one electric-yellow accent.

- `primary` (yellow `#fff95f`, black text) is for calls to action and active states only. Never use it for backgrounds, text, or decoration.
- Selection controls (checkbox, radio, switch, slider, progress, questionnaire and field choice cards) use `--control` instead, a brand blue in both modes: indigo `#4027e7` in light mode (yellow is unreadable as a small fill on cream) and the lighter periwinkle `#7d89ff` in dark mode (indigo is too dark there). `app/app.css` scopes this by `data-slot`, so the stock components stay untouched; add a new control's `data-slot` there if it has the same problem.
- Use the semantic tokens for everything else. The brand's other accents live in the chart colors: periwinkle (`chart-1`), teal (`chart-2`), gold (`chart-3`), pink (`chart-4`).
- Dark mode: the shell (page, sidebar, header) is the brand blue and cards are near-black panels set into it. Check new screens in both themes.
- Whyte Inktrap is the only UI font (`font-sans`, `font-heading`). Boing (`font-boing`) is for rare display moments such as a hero title, never for body text or controls.
- Buttons are pills and badges are fully rounded; cards and dialogs use the larger radius.
- Default and outline buttons have the brand's pressable look: a solid edge and a hard 3px offset shadow the button sinks into when pressed. The yellow button's edge is `--primary-edge` (black in light mode, a shaded gold in dark mode so it reads as the side of a yellow key); outline buttons use the text color. The same edge marks the active sidebar item, the user avatar, and toasts: toasts are brand blue (red for errors), from the `--toast`, `--toast-foreground`, and `--toast-edge` tokens.
- Fonts are self-hosted woff2 files in `public/fonts`. `@font-face` rules live in `app/app.css`, the Regular and Medium weights are preloaded in `app/routes/__root.tsx`, and fontaine (`vite.config.ts`) generates metric-matched fallbacks. To add a weight, add the file and an `@font-face` rule; keep the family names single-token (`whyte-inktrap`, `boing`) so the fallbacks match.

## Approved UI primitives

Current local primitives in `app/components/ui/`:

- `accordion`
- `alert`
- `alert-dialog`
- `aspect-ratio`
- `attachment`
- `avatar`
- `badge`
- `banner`
- `breadcrumb`
- `bubble`
- `button`
- `button-group`
- `calendar`
- `card`
- `carousel`
- `chart`
- `checkbox`
- `collapsible`
- `combobox`
- `command`
- `context-menu`
- `dialog`
- `direction`
- `drawer`
- `dropdown-menu`
- `empty`
- `field`
- `file-upload`
- `hover-card`
- `input`
- `input-group`
- `input-otp`
- `item`
- `kanban`
- `kbd`
- `label`
- `marker`
- `media-player`
- `menubar`
- `message`
- `message-scroller`
- `native-select`
- `navigation-menu`
- `pagination`
- `phone-input`
- `popover`
- `progress`
- `questionnaire`
- `radio-group`
- `resizable`
- `scroll-area`
- `select`
- `separator`
- `sheet`
- `sidebar`
- `skeleton`
- `slider`
- `sortable`
- `spinner`
- `stat`
- `switch`
- `table`
- `tabs`
- `textarea`
- `timeline`
- `toast`
- `toggle`
- `toggle-group`
- `tooltip`
- `tour`

Before adding a new primitive, check whether one of the above already solves the problem.

Related compound pieces that also exist in this repo:

- `app/components/data-table/data-table.tsx`
- `app/components/data-table/data-table-pagination.tsx`

Docs patterns or higher-level compositions that should be built on top of the primitives above:

- `data-table` via the local `app/components/data-table/*` helpers plus `Table`
- `date-picker` via `Popover + Button + Calendar`
- `typography` via semantic HTML plus the token-aware utility scale
- AI chatbot example under `app/components/ai-elements/`

Intentional exclusion:

- do not add `sonner`; notifications use the `toast` component (`toast.add({ title, type })` from `~/components/ui/toast`)

## How to add a new shadcn component

The shadcn skill in `.claude/skills/shadcn` covers the CLI, composition, forms, chat, and styling rules. Follow it.

Preferred order:

1. check `app/components/ui/` first; the list above may already cover the need
2. install with `pnpm dlx shadcn@latest add <component>`; the CLI reads `components.json` and delivers the Base UI version
3. if the CLI asks to overwrite an existing file, answer no unless you mean to update that component
4. verify imports and aliases
5. make sure the component uses the existing token system
6. run `pnpm lint`, `pnpm typecheck`, and `pnpm build`

Base UI composition (not Radix):

- custom triggers use the `render` prop: `<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>`; never `asChild`
- a `Button` rendered as a link needs `nativeButton={false}`: `<Button nativeButton={false} render={<Link to="/x" />}>Go</Button>`
- menu item actions use `onClick`, not `onSelect` (`onSelect` is only for `Command` items and `Calendar`)
- state styling uses Base UI data attributes (`data-open:`, `data-closed:`, `data-checked:`, `data-starting-style:`), not `data-[state=...]`
- local changes to stock wrappers, keep them when updating: `button` is pill-shaped, pressable (default and outline), with a foreground-colored `link` variant (brand), `dropdown-menu` and `tooltip` forward a `container` prop (the media player needs it), menu options never wrap (`dropdown-menu` grows to fit its options, at least as wide as its trigger; `context-menu` and `menubar` follow), and `toast` is brand blue with the pressable edge, its viewport at `z-100` so toasts stay above open dialogs and drawers

Rules:

- keep shadcn primitives in `app/components/ui/`
- keep AI Elements registry components and examples in `app/components/ai-elements/`
- keep feature-specific wrappers outside `ui/`
- keep generated dependencies that are actually used; do not churn package choices unless the repo stops compiling or the import path is clearly wrong
- if generated imports are wrong for this repo, fix them immediately instead of working around them downstream
- if a docs page is not a registry primitive, implement it as a composition example instead of inventing a fake `ui/*.tsx` primitive

## Chat and AI interfaces

Chat threads use the shadcn chat primitives: `MessageScroller` for the scrolling thread, `Message` for rows, `Bubble` for message surfaces, `Attachment` for files, and `Marker` for status lines and date dividers. Use the `shimmer` utility for "Thinking…" text.

AI Elements fill the gaps shadcn does not cover (prompt input, reasoning, sources, suggestions, model selector, speech input). The AI Elements registry still ships Radix-style code: after adding one, convert `asChild` to `render` and `onSelect` to `onClick` on menu items.

Rules:

- install AI Elements into `app/components/ai-elements/`
- keep the underlying shadcn primitives in `app/components/ui/`
- surface AI Elements demos inside `/dashboard/design-system`
- do not move AI Elements composites into `app/components/ui/` unless they are deliberately simplified into generic primitives used outside AI flows
- keep AI Elements examples documented there as composite patterns, not as new `ui/` primitives

## Token usage

Use the semantic tokens already defined in `app/app.css`.

Prefer utilities based on:

- `bg-background`
- `text-foreground`
- `bg-card`
- `text-muted-foreground`
- `border-border`
- `bg-sidebar`
- `text-sidebar-foreground`
- `bg-primary`
- `text-primary-foreground`
- `bg-accent`
- `text-accent-foreground`

Do not hardcode large new color systems inside route files or components unless the feature truly needs a deliberate one-off visual treatment.

## Theme behavior

This app supports light and dark mode through a root `.dark` class.

Rules:

- new components must work in both themes through semantic tokens
- do not branch styles manually with unrelated magic colors
- if you add a control that changes appearance by theme, test both modes

## Composition rules

Use primitives to compose features rather than copying styles inline repeatedly.

Recommended patterns:

- `Card` for grouped content blocks
- `Tabs` for compact view switching
- `Dialog` for modal workflows only when truly necessary
- `Sheet` for mobile or side-panel flows
- `Popover` for lightweight floating controls
- `Accordion` for progressive disclosure
- `Sidebar` only for app shell navigation
- `Switch` for binary settings
- `Calendar` as the single shared calendar primitive for both direct calendars and date pickers
- `toast` as the only notification system
- `Questionnaire` for guided multiple-choice questions

## Dashboard-specific rules

For authenticated application pages:

- keep navigation inside the dashboard sidebar
- keep pages nested under `dashboard.tsx` so layout state persists
- do not add internal docs or LLM instructions to user-facing dashboard UI

## Motion rules

This repo already uses `tw-animate-css` and animated shadcn wrappers.

Rules:

- prefer the existing motion classes already used by local primitives
- do not add random bespoke animation systems for one component
- use motion to clarify state changes, not to decorate everything

## Examples

Good:

- a feature page composed from `Card`, `Button`, `Input`, and `Tabs`
- a settings row composed from text plus `Switch`
- a confirm flow using `Dialog` with token-based colors

Bad:

- a route file containing 200 lines of repeated utility classes that should be a reusable component
- adding a second sidebar implementation instead of using the existing sidebar primitives
- importing a new UI kit for something already covered by shadcn

## Verification after UI changes

Always run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

If the change affects navigation, auth, or responsive behavior, also verify it in the browser.

If the change touches the Design System page, verify that every installed primitive still appears there and that the docs-only patterns remain rendered:

- `data-table`
- `date-picker`
- `typography`
