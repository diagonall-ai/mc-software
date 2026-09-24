# UI System Guide

This file defines how UI should be built in this repository.

Use the existing shadcn setup. Do not invent a parallel component system.

## Registry and source of truth

This repo uses the shadcn registry config in `components.json`.

Important settings:

- style: `new-york`
- css file: `app/app.css`
- aliases:
  - `~/components`
  - `~/components/ui`
  - `~/lib/utils`

The global token system lives in `app/app.css`. New UI work should consume those tokens through Tailwind utilities and CSS variables, not by inventing ad hoc color values.

## Approved UI primitives

Current local primitives in `app/components/ui/`:

- `accordion`
- `alert`
- `alert-dialog`
- `aspect-ratio`
- `avatar`
- `badge`
- `banner`
- `breadcrumb`
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
- `media-player`
- `menubar`
- `native-select`
- `navigation-menu`
- `pagination`
- `phone-input`
- `popover`
- `progress`
- `radio-group`
- `resizable`
- `scroll-area`
- `select`
- `separator`
- `sheet`
- `sidebar`
- `skeleton`
- `slider`
- `sonner`
- `sortable`
- `spinner`
- `stat`
- `switch`
- `table`
- `tabs`
- `textarea`
- `timeline`
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
- AI Elements examples and composites under `app/components/ai-elements/`

Intentional exclusion:

- do not add or use shadcn `toast`; notifications use `sonner` only

## How to add a new shadcn component

Preferred order:

1. use the existing shadcn registry configuration
2. generate or install the component into `app/components/ui`
3. verify imports and aliases
4. make sure the component uses the existing token system
5. run `pnpm lint`, `pnpm typecheck`, and `pnpm build`

Rules:

- keep shadcn primitives in `app/components/ui/`
- keep AI Elements registry components and examples in `app/components/ai-elements/`
- keep feature-specific wrappers outside `ui/`
- keep generated dependencies that are actually used; do not churn package choices unless the repo stops compiling or the import path is clearly wrong
- if generated imports are wrong for this repo, fix them immediately instead of working around them downstream
- if a docs page is not a registry primitive, implement it as a composition example instead of inventing a fake `ui/*.tsx` primitive

## AI Elements

This repo can host AI Elements registry components, but they are not part of the base `ui/` primitive layer.

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
- `Sonner` as the only notification system

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
