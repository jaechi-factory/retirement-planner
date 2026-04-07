---
title: "feat: Apply Wanted Design System (WDS) components throughout the app"
type: feat
status: completed
date: 2026-04-06
---

# feat: Apply Wanted Design System (WDS) throughout the app

## Overview

Replace all hand-rolled UI primitives (buttons, input shells, labels, dividers, badges) with
`@wanteddev/wds` components. The goal is visual consistency with the Montage design system,
reduced custom CSS, and access to WDS accessibility primitives.

Scope: UI layer only. Engine, store, and types are untouched.

## Problem Frame

The app currently uses inline styles with custom `--tds-*` / `--ux-*` / `--result-*` CSS
variables for all UI. WDS (Emotion-based, Wanted's internal design system) has been released
and the team wants all new and existing components to use WDS primitives going forward.

## Requirements Trace

- R1. Every UI primitive that has a WDS equivalent must use it (Button, TextField, Typography, Switch, Divider, ContentBadge, SectionHeader, Chip, TextButton)
- R2. The `--result-*` and `--ux-*` custom CSS variables may remain where WDS has no semantic-token equivalent (result panel coloring)
- R3. Recharts charts are unchanged — WDS has no chart component
- R4. Engine, store, and types are unchanged
- R5. TypeScript must pass and the app must build after each unit

## Scope Boundaries

- No engine logic changes
- No chart library changes (Recharts stays)
- No dark mode implementation (light mode only for now)
- No design token migration for `--result-*` / `--ux-*` vars — those stay as-is

## Context & Research

### Relevant Code and Patterns

- `src/components/input/shared/NumberInput.tsx` — custom text input with draft-state management; visual shell → `TextField`
- `src/components/input/shared/RateInput.tsx` — numeric % input; same as above
- `src/components/input/shared/SectionCard.tsx` — section container with title/subtitle; title/subtitle → `Typography`
- `src/components/input/pension/shared-components.tsx` — `Divider`, `TextBtn`, `ModeLabel` primitives
- `src/components/layout/InputWorkbench.tsx` — reset button; → `Button`
- `src/components/layout/ResultHeroSection.tsx` — status badge (`<span>`); → `ContentBadge`
- `src/components/layout/EvidenceWorkspace.tsx` — section label, body copy; → `Typography`
- `src/components/layout/ActionPlanSection.tsx` — action items; section label → `Typography`
- `src/components/layout/WhyThisResultSection.tsx`, `FundingPathSection.tsx`, `HouseStrategyComparisonSection.tsx` — inline typography and dividers

### WDS Component Reference

| WDS Component | Replaces |
|---|---|
| `TextField` | `NumberInput` visual shell, `RateInput` visual shell |
| `Typography` | All `<div>/<p>/<h3>/<span>` with fontSize/fontWeight inline styles |
| `Button` | `InputWorkbench` reset button, mode-toggle buttons |
| `TextButton` | `TextBtn` (pension section expand/collapse links) |
| `Switch` | Enable/disable toggles (if any) |
| `Chip` | Mode-toggle buttons in pension cards (`간편 계산` / `내가 직접 입력`) |
| `ContentBadge` | Status badge in `ResultHeroSection` (`안정적`, `조정 필요`, `부족`) |
| `Divider` | All `<div style={{ height: 1, background: ... }}>` separators |
| `SectionHeader` | Uppercase section labels in result panel (`근거 확인`, `왜 이런 결과인지`, etc.) |
| `FlexBox` / `Box` | Structural layout wrappers (optional, adopt where it simplifies) |

### WDS Typography Variants (reference)

`display1/2/3`, `title1/2/3`, `heading1/2`, `headline1/2`, `body1`, `body1-reading`, `body2`,
`body2-reading`, `label1`, `label1-reading`, `label2`, `caption1`, `caption2`

Weight prop: `regular` | `medium` | `bold`

### WDS Button API

`variant`: `solid` | `outlined` · `color`: `primary` | `assistive` · `size`: `small` | `medium` | `large`

### WDS TextField API

Main component (forwarded ref to `<input>`). Slots: `leadingContent`, `trailingContent` (pass `<TextField.Content variant="text">` for unit label), `trailingButton`. Props: `invalid`, `positive`, `disabled`, `width`, `height`, `type`, `onReset`.

There is no `TextFieldInput` sub-component — `TextField` itself IS the input.

### WDS ContentBadge API

`size`: `xsmall` | `small` | `medium` · `variant`: `solid` | `outlined`
Use with `leadingContent`/`trailingContent` slots for icon+text badges.

### WDS Chip API

`size`: `xsmall` | `small` | `medium` | `large` · `variant`: `solid` | `outlined`
`active` boolean for selected state. Use for interactive selection (mode toggles).

### WDS SectionHeader API

`size`: `xsmall` | `small` | `medium` | `large` · `headingContent` (ReactNode) · `trailingContent` (ReactNode) · `headingTag` (`h1`-`h6`)

### CSS Variable Co-existence

WDS injects its own CSS custom properties via `ThemeProvider` + `global.css`. The existing
`--tds-*`, `--ux-*`, `--result-*` variables in `src/index.css` do not conflict because they use
different namespaces. Keep them for now; the result panel uses them extensively and their removal
is out of scope.

## Key Technical Decisions

- **TextField as direct input**: `TextField` forwards ref to `<input>`. The existing `NumberInput` draft-state logic (`useState`, `onFocus`, `onBlur`, `onChange`) is preserved; only the visual wrapper (`<div>` border + padding) is replaced.
- **Trailing unit label**: Use `TextField.Content` with `variant="text"` in the `trailingContent` slot for `만원`, `%`, `세`, etc.
- **Chip for mode toggles**: The pension card mode buttons (`간편 계산` / `내가 직접 입력`) become `Chip` with `active` prop.
- **TextButton for expand/collapse**: `TextBtn` in pension cards becomes WDS `TextButton`.
- **ContentBadge for status**: `ResultHeroSection` status span becomes `ContentBadge` with `solid` variant and appropriate color via `sx` override if the three status states don't match WDS's predefined color tokens.
- **SectionHeader for uppercase labels**: The uppercase `근거 확인`, `왜 이런 결과인지` section labels become `SectionHeader` with `headingTag="h2"` and `size="small"`.
- **Keep result panel inline styles**: `--result-*` color/spacing vars remain inline. Only typography and structural separators get WDS primitives.
- **No Emotion sx at scale**: Use WDS components via their `className`/`style` props where possible to avoid introducing Emotion `sx` patterns across the result panel. Limit `sx` to WDS-component-level overrides.

## Open Questions

### Resolved During Planning

- **GitHub Packages auth**: Install requires `@wanteddev:registry=https://npm.pkg.github.com/` in `.npmrc` plus `//npm.pkg.github.com/:_authToken=TOKEN`. Use `gh auth token` to get the token at install time. Add `.npmrc` with registry config (token is user-local, not committed).
- **Emotion peer dep**: WDS depends on `@wanteddev/wds-engine` which uses Emotion internally. Emotion is installed transitively — no need to add `@emotion/react` directly.
- **React 19 compatibility**: WDS dev deps show `react: ^19.2.4` — fully compatible with this project's React 19.

### Resolved During Implementation (Units 1–6)

- **`TextField.Content` does not exist as sub-component**: The correct import is `TextFieldContent` as a standalone named export from `@wanteddev/wds`. Usage: `import { TextField, TextFieldContent } from '@wanteddev/wds'`.
- **`semantic.label.tertiary` color token does not exist**: Use `semantic.label.alternative` instead. This was caught during Unit 3/4 implementation and fixed before merging.

### Deferred to Implementation (Units 7–8)

- Whether `ContentBadge` size/variant covers the three result status states (stable/adjust/shortage) visually without `sx` — verify at Unit 7 implementation. If not, fall back to `style` prop with `--ux-status-*` CSS vars (not `sx`, per Key Technical Decisions).
- Whether `SectionHeader` renders correctly with Korean uppercase labels and `textTransform: 'uppercase'` via `style` prop — verify at first use in Unit 7.
- Whether `ContentBadge variant="outlined" size="xsmall"` for the `추천` badge in `HouseDecisionRows` matches the existing subtle outlined pill style — verify in Unit 8; fall back to a styled `<span>` if ContentBadge token can't match `--result-text-faint-color` border.
- Whether WDS `caption2` maps to the 11px text size used in `FundingPathSection` stage labels — if not, use `style={{ fontSize: 11 }}` override.

## Implementation Units

- [x] **Unit 1: Registry config + package installation**

**Goal:** Configure GitHub Packages registry and install `@wanteddev/wds` + `@wanteddev/wds-icon`.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `.npmrc`
- Modify: `package.json` (dependency added by npm install)
- Modify: `package-lock.json` or `node_modules` (transitive)

**Approach:**
- Add `@wanteddev:registry=https://npm.pkg.github.com/` to `.npmrc`
- Add `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}` using env-var syntax (so the token is not hardcoded and `.npmrc` can be committed safely)
- Run `npm install @wanteddev/wds @wanteddev/wds-icon`
- Verify `npm run build` passes (no typecheck failures from new deps)

**Patterns to follow:**
- `.npmrc` pattern: registry scoping per GitHub Packages convention

**Test scenarios:**
- Test expectation: none — pure dependency install, no behavioral change

**Verification:**
- `node_modules/@wanteddev/wds` exists
- `npm run build` exits 0
- `npx tsc --noEmit` exits 0

---

- [x] **Unit 2: ThemeProvider + global.css setup**

**Goal:** Wrap the app in WDS `ThemeProvider` and import `@wanteddev/wds/global.css` so WDS components receive their theme context and CSS custom properties.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/index.css` (or import order)

**Approach:**
- Import `@wanteddev/wds/global.css` at the top of `src/main.tsx` (before `./index.css` to allow overrides)
- Wrap `<StrictMode><App /></StrictMode>` with `<ThemeProvider>` from `@wanteddev/wds`
- Verify that `--tds-*` and `--result-*` vars in `src/index.css` still take effect (they should — different namespaces)
- No dark-mode toggle needed at this stage

**Patterns to follow:**
- `src/main.tsx` current structure

**Test scenarios:**
- Test expectation: none — purely structural, no behavioral change. Visual verification: app loads without console errors.

**Verification:**
- App renders without console errors about missing ThemeProvider context
- Existing styles are visually unchanged after adding ThemeProvider

---

- [x] **Unit 3: NumberInput → TextField**

**Goal:** Replace `NumberInput`'s hand-rolled visual shell with WDS `TextField`, keeping all draft-state logic intact.

**Requirements:** R1

**Dependencies:** Unit 2

**Files:**
- Modify: `src/components/input/shared/NumberInput.tsx`

**Approach:**
- Remove the outer `<div>` wrapper with border/background inline styles
- Remove the inner `<input>` raw element
- Replace with `<TextField>` forwarding all existing event handlers (`onFocus`, `onBlur`, `onChange`) and `value={displayValue}`
- Pass unit label via `trailingContent={<TextField.Content variant="text">{unit}</TextField.Content>}`
- Pass `inputMode="numeric"` and `placeholder="0"` directly to `TextField`
- Replace `<label>` with `<Typography variant="label2" weight="medium">` or `<Typography variant="caption1">` (match current 13px/600 label style)
- Replace hint `<p>` with `<Typography variant="caption2" color="semantic.label.alternative">`
- The draft state (`useState`, `handleFocus`, `handleBlur`, `handleChange`) is entirely preserved

**Patterns to follow:**
- `src/components/input/shared/NumberInput.tsx` — current logic
- WDS `TextField` source at `packages/wds/src/components/text-field/index.tsx`

**Test scenarios:**
- Happy path: enter "500" → `onChange(500)` fires, display shows "500만원" after blur
- Edge case: enter empty string → `onChange(0)` fires, placeholder shown
- Edge case: enter value exceeding `max` → clamped to `max`
- Happy path: unit label "세" appears in trailing slot

**Verification:**
- All existing input sections render without errors
- Numeric entry, blur, and clamping behavior unchanged

---

- [x] **Unit 4: RateInput → TextField**

**Goal:** Apply the same TextField migration to `RateInput`.

**Requirements:** R1

**Dependencies:** Unit 3

**Files:**
- Modify: `src/components/input/shared/RateInput.tsx`

**Approach:**
- Same pattern as `NumberInput` migration (Unit 3)
- Trailing content: `<TextField.Content variant="text">%</TextField.Content>`
- Label → `Typography variant="label2"`
- Keep existing draft-state logic

**Patterns to follow:**
- `src/components/input/shared/NumberInput.tsx` after Unit 3

**Test scenarios:**
- Happy path: enter "5" → onChange(5) fires, shows "5%"
- Edge case: enter decimal (e.g. "3.5") — verify current behavior preserved

**Verification:**
- `RateInput` renders with WDS shell, % trailing label visible

---

- [x] **Unit 5: SectionCard typography + pension shared primitives**

**Goal:** Replace inline `<h3>`, `<p>`, and `<button>` primitives in `SectionCard` and pension `shared-components.tsx` with WDS equivalents.

**Requirements:** R1

**Dependencies:** Unit 2

**Files:**
- Modify: `src/components/input/shared/SectionCard.tsx`
- Modify: `src/components/input/pension/shared-components.tsx`

**Approach:**

*SectionCard*:
- `<h3>` (15px/700/gray-900) → `<Typography variant="headline2" weight="bold" as="h3">`
- `<p>` subtitle (12px/gray-400) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Container `<div>` keep as-is (no WDS equivalent for the card shell) OR use `Box` with sx for border/padding

*pension/shared-components.tsx*:
- `Divider` (`<div>` 1px gray-100) → `<Divider>` from WDS
- `TextBtn` (`<button>` underline gray-400) → `<TextButton size="small">` from WDS; update color to match
- `ModeLabel` (`<span>` 11px gray-400/600) → `<Typography variant="caption2" weight="medium" color="semantic.label.alternative">`

**Patterns to follow:**
- WDS `Divider`: `import { Divider } from '@wanteddev/wds'`
- WDS `TextButton`: `import { TextButton } from '@wanteddev/wds'`

**Test scenarios:**
- Happy path: SectionCard renders title and subtitle with WDS Typography styles
- Happy path: pension Divider renders as horizontal line
- Happy path: TextBtn expand/collapse still fires onClick

**Verification:**
- All input section cards render with WDS Typography for headings
- Pension expand/collapse links still work

---

- [x] **Unit 6: Input section buttons, labels, and pension mode toggles**

**Goal:** Replace inline-styled `<button>` elements and freestanding text labels with WDS `Button`, `Typography`, and `Chip`.

**Requirements:** R1

**Dependencies:** Unit 5

**Files:**
- Modify: `src/components/layout/InputWorkbench.tsx`
- Modify: `src/components/input/pension/PublicPensionCard.tsx`
- Modify: `src/components/input/pension/RetirementPensionCard.tsx`
- Modify: `src/components/input/pension/PrivatePensionCard.tsx`
- Modify: `src/components/input/PensionSection.tsx`
- Modify: `src/components/input/CurrentStatusSection.tsx` (cashflow summary typography)
- Modify: `src/components/input/AssetSection.tsx` (asset name labels)

**Approach:**

*InputWorkbench reset button*:
- `<button>` → `<Button variant="outlined" color="assistive" size="small">` for normal state
- Danger state (confirm): `<Button variant="solid" color="primary" size="small">` with red sx override

*Pension mode toggles* (`간편 계산` / `내가 직접 입력`):
- Two `<button style={toggleBtnStyle(...)}>` → Two `<Chip active={isAuto}>간편 계산</Chip>` and `<Chip active={!isAuto}>내가 직접 입력</Chip>` in a flex row

*Freestanding labels in CurrentStatusSection* (cashflow summary):
- `<span>`, `<div>` with fontSize/color inline → `<Typography>` with matching variant

*Asset section asset-name `<p>` labels*:
- Replace with `<Typography variant="label2" weight="medium">` with conditional color via `color` token

**Patterns to follow:**
- `src/components/input/pension/shared-components.tsx` (after Unit 5)
- WDS `Chip` source

**Test scenarios:**
- Happy path: reset button shows "전체 초기화", click confirms, second click resets
- Happy path: pension mode toggle switches between auto/manual — Chip active state reflects change
- Edge case: confirmReset timeout (3s) reverts state, Button reflects change

**Verification:**
- All buttons functional; mode toggles reflect active state via Chip active prop
- TypeScript passes

---

- [x] **Unit 7: Result hero + reason + funding sections (upper result panel)**

**Goal:** Replace inline text elements and separator lines in the three upper result sections with WDS `Typography`, `ContentBadge`, `SectionHeader`, and `Divider`. These three files are self-contained and share no file overlap with Unit 8.

**Requirements:** R1, R2

**Dependencies:** Unit 2

**Files:**
- Modify: `src/components/layout/ResultHeroSection.tsx`
- Modify: `src/components/layout/WhyThisResultSection.tsx`
- Modify: `src/components/layout/FundingPathSection.tsx`

**Approach:**

*ResultHeroSection.tsx* — element inventory:
- Status `<span>` badge (inline color via `--ux-status-*` CSS vars) → `<ContentBadge variant="solid" size="small">` with `style` override keeping `--ux-status-positive/negative/warning` colors. Do not use `sx` — keep `style` prop to avoid Emotion at scale (see Key Technical Decisions)
- Sub-label `<span>` (meta text) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Headline `<div>` (32px/800, uses `--result-text-display` var for font-size) → `<Typography variant="display3" weight="bold" style={{ ...existing letterSpacing/lineHeight vars }}>`. Keep `style` for the CSS var-based size so `--result-text-display` still drives the value
- Metric card label `<div>` (meta) → `<Typography variant="caption2" color="semantic.label.alternative">`
- Metric card value `<div>` (metric size/700, tone-colored) → `<Typography variant="headline2" weight="bold" style={{ color: metricToneColor(...) }}>` (color stays inline because it uses `--ux-status-*` vars)
- Summary separator `<div style={{ borderTop: ... }}>` → `<Divider>`
- Summary "권장 전략/현재 상태" label `<span>` → `<Typography variant="caption1" color="semantic.label.alternative">`
- Strategy label `<span>` (title/700) → `<Typography variant="headline2" weight="bold">`
- Recommendation reason `<div>` (body) → `<Typography variant="body1">`

*WhyThisResultSection.tsx* — element inventory:
- Uppercase section label `<div>` (textTransform uppercase, meta/700) → `<SectionHeader headingContent="이런 결과가 나온 이유" size="small" headingTag="h2" style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>`
- Card title `<div>` (body/700) → `<Typography variant="body1" weight="bold" style={{ color: 'var(--result-text-strong-color)' }}>`
- Card body `<div>` (body/regular) → `<Typography variant="body1" style={{ color: 'var(--result-text-body-color)', lineHeight: 1.62 }}>`
- Card left-border accent stays as `borderLeft` on the container `<div>` — no WDS equivalent

*FundingPathSection.tsx* — element inventory:
- Uppercase section label `<div>` → `<SectionHeader>` (same pattern as WhyThisResultSection)
- Stage age label `<div>` text inside the timeline (11px, `--result-text-faint-color`) → `<Typography variant="caption2" color="semantic.label.alternative">` with `style` for size (caption2 may not be 11px — verify at implementation and fall back to `style={{ fontSize: 11 }}` if needed)
- Stage label inside colored blocks `<span>` (11px/600, `cfg.color`) → `<Typography variant="caption2" weight="medium" style={{ color: cfg.color }}>` keeping inline color because `BUCKET_CONFIG` uses direct hex values (R2 rationale)
- Legend item label `<span>` (cfg.color, 600) → `<Typography variant="caption2" weight="medium" style={{ color: cfg.color }}>`
- Legend item range `<span>` → `<Typography variant="caption2" color="semantic.label.alternative">`
- All block/bar structure stays as inline `<div>` — WDS has no timeline primitive

**Patterns to follow:**
- WDS `Typography` variants table in this plan
- WDS `ContentBadge` API (size, variant, style override)
- WDS `SectionHeader` API (headingContent, size, headingTag)
- Current `ResultWorkbench.tsx` EmptyStateCard function — already uses WDS Typography; follow its import style

**Test scenarios:**
- Happy path: result panel renders `ContentBadge` with correct label in each of the 3 states: `안정적` (stable), `조정 필요` (adjust), `부족` (shortage)
- Happy path: `이런 결과가 나온 이유` renders as `SectionHeader` with uppercase preserved
- Happy path: `FundingPathSection` renders all bucket types — colored blocks display labels at 11px
- Edge case: `hasRealEstate=false` — ResultHeroSection summary shows "현재 상태" label, all Typography still renders
- Edge case: `FundingPathSection` with `fundingTimeline` empty → component returns null (no regression)
- Integration: result panel TypeScript build passes (`npm run build`)

**Verification:**
- All three files build without TypeScript errors
- Result panel renders in all three badge states with no visual regressions
- No raw `<div>/<span>` with `fontSize`/`fontWeight` inline styles remain for text content (except where color must stay inline for CSS vars)

---

- [x] **Unit 8: Evidence, strategy comparison, and action sections (lower result panel)**

**Goal:** Replace inline text elements in the four lower result sections with WDS `Typography`, `ContentBadge`, `SectionHeader`, and `Divider`. Partition is clean — these four files have no overlap with Unit 7.

**Requirements:** R1, R2

**Dependencies:** Unit 7

**Files:**
- Modify: `src/components/layout/EvidenceWorkspace.tsx`
- Modify: `src/components/layout/HouseStrategyComparisonSection.tsx`
- Modify: `src/components/layout/HouseDecisionRows.tsx`
- Modify: `src/components/layout/ActionPlanSection.tsx`

**Approach:**

*EvidenceWorkspace.tsx* — element inventory:
- Uppercase section label `<div>` (`근거 확인`) → `<SectionHeader headingContent="근거 확인" size="small" headingTag="h2" style={{ textTransform: 'uppercase', ... }}>`
- Chart sub-section title `<div>` (`돈 흐름`, body/700) → `<Typography variant="body1" weight="bold">`
- Chart interpretation `<div>` (meta text) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Strategy label badge `<span>` (blue pill, `--result-accent-strong`) → `<ContentBadge variant="solid" size="xsmall" style={{ color: 'var(--result-accent-strong)', background: '#E1EDFF', border: '1px solid ...' }}>` — keep inline colors because they use `--result-accent-strong` (not a WDS token)
- Sub-section title `<div>` (`나이별 주요 이벤트`, body/700) → `<Typography variant="body1" weight="bold">`
- `<summary>` toggle `가정과 주의 보기` (meta/700) → `<Typography as="span" variant="caption1" weight="bold">` (inside native `<summary>` — keep `<summary>` element, replace inner text node with Typography)
- Sub-label `<div>` (`주요 가정`, `주의 사항`, meta/700) → `<Typography variant="caption1" weight="bold">`
- Assumption list item text `<span>` → `<Typography variant="caption1">` (wrap text after bullet)
- Warning list items keep custom `borderRadius`/`background`/`border` container styling — only the text inside can use Typography, but the container styling must stay inline (uses `--ux-status-*` vars not mappable to WDS)

*HouseStrategyComparisonSection.tsx* — element inventory:
- Section title `<div>` (`집을 팔거나 대출받는 선택`, title/700) → `<Typography variant="headline1" weight="bold">`
- Section sub-description `<div>` (meta/regular) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Sub-label `<div>` (`전략별 가능한 월 생활비`, meta/600) → `<Typography variant="caption1" weight="medium">`
- Separator `<div style={{ borderTop: ... }}>` → `<Divider>`
- Instruction text `<div>` (`전략을 누르면...`, meta) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Recharts BarChart and tooltip — unchanged (R3)
- CustomTooltip inner `<div>` text (strategy name, values) → `<Typography>` optional; tooltip is a contained overlay — apply Typography if clean, otherwise skip (tooltip already uses `fontSize: 13` inline which is fine to leave)

*HouseDecisionRows.tsx* — element inventory:
- `MetricCell` label `<span>` (meta/regular, `--result-text-faint-color`) → `<Typography variant="caption2" color="semantic.label.alternative">`
- `MetricCell` value `<span>` (title size, 600/700) → `<Typography variant="headline2" weight="bold" style={{ color: selected ? 'var(--result-text-body-color)' : 'var(--result-text-value-strong-color)' }}>` — color stays inline (CSS vars)
- Strategy label `<span>` (title/600-700) → `<Typography variant="headline2" weight={selected ? 'bold' : 'medium'} style={{ color: selected ? 'var(--result-accent-strong)' : 'var(--result-text-body-color)' }}>`
- `추천` badge `<span>` (small outlined pill) → `<ContentBadge variant="outlined" size="xsmall">추천</ContentBadge>` — color may need `style` override if WDS token doesn't match `--result-text-faint-color`; verify at implementation
- `계산 불가` text `<span>` → `<Typography variant="caption1" color="semantic.label.alternative">`
- Selected detail text `<div>` (remaining money, house cash) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Disabled reason `<div>` → `<Typography variant="caption2" color="semantic.label.alternative">`
- Interactive `<button>` row wrapper — keep as native `<button>` (complex selected/hovered/disabled state via CSS vars; not replaceable with WDS Button without losing the custom inset-box-shadow interaction pattern)
- Arrow `›` decorative `<span>` — keep as-is

*ActionPlanSection.tsx* — element inventory:
- Uppercase section label `<div>` (`지금 해야 할 일`) → `<SectionHeader>` (same pattern)
- Empty state body `<div>` → `<Typography variant="body1">`
- Action item title `<div>` (body/700) → `<Typography variant="body1" weight="bold">`
- Action item detail `<div>` (meta) → `<Typography variant="caption1" color="semantic.label.alternative">`
- Numbered circle `<span>` (custom circle with `--result-accent-strong` bg) — keep as-is (no WDS numbered-step primitive)
- Arrow `→` decorative `<span>` — keep as-is

**Patterns to follow:**
- Unit 7 Typography mapping (apply consistently across these files)
- `src/components/layout/ResultHeroSection.tsx` after Unit 7 (for ContentBadge style override pattern)

**Test scenarios:**
- Happy path: `EvidenceWorkspace` renders section label, chart header, and strategy badge with `hasRealEstate=true`
- Happy path: `EvidenceWorkspace` with `hasRealEstate=false` — no strategy badge shown; assumptions/warnings list renders
- Happy path: `HouseStrategyComparisonSection` renders with 2 selectable strategies — Divider visible, ContentBadge `추천` visible on recommended row
- Happy path: `HouseDecisionRows` — selecting a row shows detail text in Typography; disabled row shows `계산 불가` in Typography
- Happy path: `ActionPlanSection` renders 2–3 items with `hasRealEstate=true` — numbered circles and arrows stay custom
- Edge case: `ActionPlanSection` with 0 items (안정적 상태) — empty state Typography renders
- Edge case: `HouseStrategyComparisonSection` with `hasRealEstate=false` → returns null (no regression)
- Integration: `npm run build` exits 0 after all four files are modified

**Verification:**
- All four files build without TypeScript errors
- `npm run build` passes
- Result panel renders correctly in QA scenarios: 금융자산 소진+집 있음, 금융자산 소진+집 없음, 금융자산 소진 없음

---

## System-Wide Impact

- **Interaction graph:** ThemeProvider wraps the root — all WDS components automatically receive theme context. No callbacks or middleware are affected. Recharts components are inside the component tree but do not use WDS context.
- **Error propagation:** If `ThemeProvider` is missing, WDS components throw a missing-context error. Unit 2 must land before any WDS component usage.
- **State lifecycle risks:** None — engine/store are untouched.
- **API surface parity:** No exported types or interfaces change.
- **Integration coverage:** The full render path (inputs → engine → result panel) is exercised by running the app manually against the QA scenarios in `CLAUDE.md`.
- **Unchanged invariants:** Chart components (`AssetBalanceChart`, `PropertyAssetChart`, `PropertyStrategyChart`), engine (`src/engine/`), store (`src/store/`), and types (`src/types/`) are not touched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| GitHub Packages auth fails at install time | Use `gh auth token` to generate token; document setup in `CLAUDE.md` |
| WDS Emotion styles conflict with Tailwind CSS v4 | Both use CSS custom properties — different namespaces. If conflict, add `createCache({ prepend: true })` to make Emotion prepend styles |
| `ContentBadge` color tokens don't cover status colors (green/red/amber) | Use `style` prop with existing `--ux-status-*` CSS vars as fallback |
| WDS `TextField` doesn't pass `inputMode="numeric"` to underlying input | TextField forward-refs to `<input>` and spreads `...props` — numeric inputMode should work; verify in Unit 3 |
| Bundle size increase from Emotion runtime | Acceptable tradeoff per user intent; WDS is the chosen system |

## Documentation / Operational Notes

- Add setup note to project `CLAUDE.md`: GitHub Packages token required for local install
- `.npmrc` `_authToken` uses `${GITHUB_TOKEN}` env var syntax — token is not committed to the repo
- Vercel deployment: add `GITHUB_TOKEN` env var in Vercel project settings for npm install to succeed in CI

## Sources & References

- WDS GitHub: `wanteddev/montage-web` (packages/wds)
- WDS guide: https://montage.wanted.co.kr/docs/utilities
- Component index: `packages/wds/src/components/index.ts`
- TextField source: `packages/wds/src/components/text-field/index.tsx`
- Typography variants: `packages/wds/src/components/typography/types.ts`
