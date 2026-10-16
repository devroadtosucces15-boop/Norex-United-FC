# Norex Design System — Extracted Contract v1

Status: extracted from the current Norex United implementation on `main` during ND-003.
Authority: `.norex/constitution/DESIGN_SYSTEM_LOCK.md`.

This document promotes recurring visual and interaction rules from the existing product. It does not make every historical selector a permanent standard.

## 1. Brand foundation

The implementation explicitly describes the visual language as derived from the Norex crest: ink black, crest red, white keylines, ribbon banners, wing stripes, crown and five stars.

### Canonical tokens observed in `web/style.css`

| Token | Value | Role |
|---|---|---|
| `--red` | `#c8352c` | primary Norex accent / action / focus |
| `--ink` | `#0b0f16` | deep surface / control background |
| `--bg` | `#07090d` | application background |
| `--panel` | `#10141c` | primary elevated surface |
| `--panel2` | `#161b25` | secondary/active surface |
| `--line` | `#232a36` | standard border |
| `--line2` | `#2e3746` | stronger border |
| `--text` | `#f2f4f7` | primary text |
| `--muted` | `#8d97a8` | secondary text |
| `--white` | `#fff` | high-emphasis text/keyline |
| `--win` | `#22c55e` | positive/result success |
| `--draw` | `#eab308` | neutral/warning/result draw |
| `--loss` | `#ef4444` | negative/error/result loss |
| `--gold` | `#e8c16a` | award/premium/secondary emphasis |
| `--radius` | `14px` | default container radius |

`--accent` aliases `--red`.

Do not casually replace these with a generic framework palette.

## 2. Typography

Display/headline family:
`"Oswald", Impact, "Arial Narrow", sans-serif`

Body/interface family:
`"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

Recurring headline grammar:
- uppercase
- condensed display face
- modest positive letter spacing
- tight line height
- strong hierarchy

Body/interface grammar:
- Inter/system sans
- approximately 13–15px for dense UI
- muted text for supporting metadata
- white/near-white for primary labels

## 3. Surface grammar

Norex is dark-first (`color-scheme: dark`).

Recurring surfaces:
- deep ink/background foundation
- slightly lighter bordered panels
- subtle gradients rather than flat bright blocks
- red-tinted gradient/glow for branded emphasis
- white/red keylines
- restrained shadows/backdrop blur for floating navigation
- rounded containers, generally around 10–22px depending on hierarchy

Cards typically combine:
`background: var(--panel)` + `1px solid var(--line)` + rounded corners.

Active/selected states commonly use:
- red border/keyline
- red fill
- white fill with dark text for strong binary selection
- inset red underline for navigation

## 4. Brand motifs

Recurring motifs are legitimate Norex primitives:
- crest imagery
- ribbon geometry
- wing/diagonal stripe texture
- five-star treatment
- red atmospheric glow
- stadium/pitch visual references
- restrained gold for honours/awards

These should be used intentionally; not every internal tool needs decorative stadium treatment.

## 5. Layout

Canonical content wrapper observed:
- maximum width approximately 1240px
- horizontal page padding approximately 16px

Recurring layout primitives:
- CSS Grid for responsive cards/data
- flex rows with wrapping for controls
- `minmax()` / `auto-fit` for adaptive grids
- horizontal overflow for compact mobile strips
- deliberate mobile restructuring rather than desktop shrinking

## 6. Navigation

### Desktop
- sticky translucent/dark header
- backdrop blur
- red lower keyline
- grouped navigation
- mega-menu
- sticky contextual subtabs

### Mobile browser
At <= 860px, desktop group navigation is replaced rather than merely compressed:
- fixed bottom tab bar designed for thumb reach
- safe-area inset support
- slide-up navigation sheet
- content receives bottom clearance for the tab bar
- header becomes shorter
- contextual subtabs remain horizontally scrollable

This mobile replacement pattern is a major Norex interaction rule.

## 7. Core component families

Promoted recurring families:
- buttons/actions
- chips/pills/toggles
- cards/panels
- stat tiles
- tabs/subtabs
- modal/confirm surfaces
- toast/notification feedback
- avatar/member chips and hover cards
- skeleton/empty states
- lightbox
- forms/inputs/selects/textareas
- badges/status pills
- tables/data rows
- navigation links
- event/content cards
- pitch/lineup representations

Git history explicitly records a shared member UI kit containing avatar chips, hover cards, modal/confirm, tabs, toasts, empty states, skeletons, lightbox, pills, and relative time.

ND-003 does not require every feature-specific component to become a universal primitive.

## 8. Forms and focus

Recurring form treatment:
- dark ink input surface
- `var(--line2)` border
- roughly 8–12px radius
- white text
- body typography
- explicit dark color scheme

Recurring focus treatment:
- visible Norex-red outline
- focus-visible states on custom interactive controls
- native accent color commonly set to `var(--red)`

Keyboard/focus visibility must be retained when components are ported.

## 9. Motion

Motion is part of the redesign language, but it is progressive enhancement.

Observed families:
- ribbon-wipe page transitions
- tab pill slide
- card tilt/shine
- subtle lift/translate hover
- hero parallax
- interactive crest/coin
- reveal/pop animations

Typical timing is short (~150–350ms for interface transitions), with longer ambient hero motion.

Critical rule: existing code repeatedly implements `prefers-reduced-motion: reduce` fallbacks. Norex Dev and future clients must preserve reduced-motion behavior.

Motion must not block input or become required for comprehension.

## 10. Responsive breakpoints/patterns

Observed recurring breakpoints include approximately:
- 900px: hero/layout restructuring
- 860px: desktop navigation -> mobile bottom navigation
- 560px: compact phone layout
- larger layout-specific thresholds such as 1100px for dense stat grids

These are evidence-based current-web conventions, not a mandate that native apps use CSS breakpoints.

Responsive principle:
**recompose the interface for the surface; do not simply scale desktop down.**

## 11. Accessibility contract

Evidence-backed patterns that must be retained/expanded:
- visible focus/focus-visible states
- reduced-motion support
- semantic buttons/links where present
- ARIA state usage in navigation (for example `aria-expanded`, `aria-current`)
- mobile safe-area handling
- non-motion fallback
- text/status labels in addition to decorative treatment where required

Future ND accessibility work should audit contrast, keyboard navigation, screen-reader semantics, target sizing, and non-colour encodings rather than assuming current implementation is fully compliant.

## 12. Feature CSS policy

Feature styles such as events, docs, feed, messages, profiles, builder, etc. consume the shared variables from `style.css` and add domain-specific components.

Policy:
1. shared token -> canonical
2. recurring primitive -> candidate canonical component
3. feature-specific composition -> remain feature-owned unless reused
4. one-off decoration -> not automatically promoted
5. duplicated patterns -> consolidate only when evidence justifies it

Do not perform a mass CSS refactor merely to make the design-system documentation cleaner.

## 13. Norex Dev OS application

Norex Dev OS must use the same visual language while allowing higher functional density.

Expected mapping:
- conversation/workspace background -> `--bg`
- artifact/task panels -> `--panel` / `--panel2`
- active agent/task/focus -> Norex red
- warnings/results -> semantic win/draw/loss/gold vocabulary where appropriate
- task chips/status controls -> existing pill/chip grammar
- temporary drawers/sheets -> existing layered-panel grammar
- mobile Dev OS surfaces -> recompose for touch, not desktop shrink
- terminal/diff/browser internals may retain domain conventions, but their surrounding chrome must be Norex

Functional density may differ. Visual identity may not.

## 14. Cross-platform future

Web/Desktop, Web/Mobile, iOS, and Android should share semantic design tokens and component intent, not necessarily identical implementation code.

Recommended future representation:
- provider/platform-neutral semantic token source
- web adapter -> CSS custom properties
- React Native adapter -> theme/token object
- native/platform adapters only if later required

Do not introduce this implementation during Shadow Foundation until architecture/adoption tasks authorize it.

## 15. Sources of truth observed

Primary:
- `web/style.css` — global tokens, typography, navigation, major shared components, redesign motion/layout
- `web/ui.js` — shared member UI behavior/components
- `web/app.js` — global interaction/navigation/redesign behavior

Secondary feature consumers include:
- `web/events.css`
- `web/docs.css`
- `web/feed.css`
- `web/messages.css`
- `web/profile.css`
- `web/builder.css`
- other feature CSS/JS modules

## 16. Compliance rules

New Norex surfaces should:
- consume canonical semantic tokens
- reuse existing component grammar where appropriate
- preserve focus and reduced-motion behavior
- respect mobile recomposition
- avoid arbitrary hard-coded replacement palettes
- avoid generic framework defaults leaking into the product
- avoid a second independent component language

Intentional visual deviation requires Mike approval and an ADR.

## 17. Known follow-up

This v1 contract is extraction/documentation, not a CSS normalization project.

Future work may:
- inventory exact component variants
- formalize spacing/type scales
- measure contrast
- generate platform-neutral token files
- add visual regression/design-compliance checks
- reconcile duplicated feature CSS

Those changes require their own tasks and evidence.
