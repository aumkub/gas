# Daily Sales App Design

## Overview

This project is a Thai-first daily sales reporting system focused on clarity, speed, and large touch targets for operational use. The UI is built with TailwindCSS and local reusable components (`app/components/ui/*`) following shadcn-style structure.

Design goals:
- Fast data entry for sales, bill-hold, and check groups
- Readable typography for long working sessions
- Predictable save behavior, including creating missing customer/product data during save

---

## Tech + UI Foundation

- **Framework**: React Router 7 + Cloudflare Workers SSR
- **Styling**: TailwindCSS v4 (`app/app.css`)
- **UI primitives**:
  - `Button`: `app/components/ui/button.tsx`
  - `Input`: `app/components/ui/input.tsx`
  - `Modal`: `app/components/ui/modal.tsx`
  - `Card`: `app/components/ui/card.tsx`
  - `Heading`: `app/components/Heading.tsx`

No BaseUI/Styletron dependency is used in app rendering.

---

## Color System

- **Page Background**: `#F9FAFB`
- **Surface/Card**: `#FFFFFF`
- **Text Primary**: `#111827`
- **Text Secondary**: `#4B5563`
- **Primary Action**: `#2563EB` (hover `#1D4ED8`)
- **Danger Action**: `#DC2626` (hover `#B91C1C`)
- **Neutral Tertiary**: `#F3F4F6` (hover `#E5E7EB`)
- **Success**: `#16A34A`
- **Warning**: `#EA580C`
- **Error**: `#DC2626`

---

## Typography

- **Font Family**: `Sarabun` (from `app/root.tsx`)
- **Base Body Size**: `18px` (global in `app/app.css`)
- **Heading component mapping**:
  - `level/styleLevel 1`: `text-4xl`
  - `2`: `text-3xl`
  - `3`: `text-2xl`
  - `4`: `text-xl`
  - `5`: `text-lg`
  - `6`: `text-base`

---

## Spacing and Layout

- Base spacing rhythm: Tailwind 4 scale (`4, 8, 12, 16, 24, 32, ...`)
- Common container patterns:
  - Page outer: `px-4 py-8`
  - Content max width: `max-w-6xl` to `max-w-7xl`
  - Section/card spacing: `space-y-4` to `space-y-6`
- Touch target standard:
  - Minimum control height around `48px` for entry screens

---

## Component Guidelines

### Buttons

- Use local `Button` component with variants:
  - `kind="primary"` for main actions (save/create)
  - `kind="negative"` for destructive actions (delete)
  - `kind="tertiary"` for neutral secondary actions
- Use `isLoading` during save/submit states

### Inputs

- Use local `Input` for all text/number/date fields
- Keep placeholder examples in Thai where user-facing
- For numeric money fields:
  - Use `type="number"`, `step="0.01"`, and validate before DB save

### Modal

- Use local `Modal` with `size="default"` or `size="large"`
- Keep modal content action-aligned to the right

### Card

- Use local `Card` surface for grouped content blocks
- Keep card internals with clear subheaders and summary totals

### AutoComplete

- Typing updates local form state immediately.
- Selecting from dropdown is optional for save.
- On save, backend resolves missing IDs via text values.

---

## Save UX and Data Entry Rules

Current save behavior (important for QA and product expectations):

- **Customer names**:
  - User can type a new name without selecting dropdown.
  - Save flow creates customer automatically if not found.
- **Product names (sales group)**:
  - User can type a new product without selecting dropdown.
  - Save flow creates product automatically if not found.
  - If sales row has no product at all, fallback product `ไม่ระบุสินค้า` is used.
- **Insert conditions**:
  - Sales rows are inserted when customer and product resolve and price is greater than zero.
  - Bill-hold and check rows resolve missing customer IDs by typed name.

---

## Accessibility and Usability Notes

- Large fonts and large controls are intentional and must be preserved.
- Avoid compact dense layouts for operational screens.
- Keep Thai labels explicit and consistent.
- Prefer explicit button labels over icon-only controls.

---

## Do and Don't

1. **Do** keep forms forgiving: typing should be enough, not strict dropdown-only workflows.
2. **Do** keep summary totals visible near each group and at report-level.
3. **Do** keep save actions obvious and always reachable.
4. **Don't** reintroduce BaseUI-specific `overrides`-driven styling patterns.
5. **Don't** depend on hidden state transitions that require exact click sequence to save.
6. **Do** keep all new UI components under `app/components/ui/`.
