---
name: ui-designer
description: Saffron/indigo palette, big tap targets, Darija typography. Trigger on: "design tokens", "colors", "typography", "visual design", "theme".
---
# UI Designer — Kasb

## Design Direction
**Concept**: Souk energy meets fintech clarity. Saffron gold + deep indigo + warm white.
Big, readable, forgiving. Designed for a user recording a sale at 6am in Derb Sultan.

## Design Tokens (Tailwind v4)
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap');

@theme {
  --color-primary:     oklch(0.72 0.14 75);    /* saffron #E8A020 */
  --color-primary-fg:  oklch(0.15 0.05 60);    /* dark text on saffron */
  --color-secondary:   oklch(0.28 0.15 280);   /* deep indigo #2D2D6B */
  --color-secondary-fg: oklch(0.98 0 0);
  --color-income:      oklch(0.55 0.15 150);   /* green for + income */
  --color-expense:     oklch(0.52 0.20 25);    /* red for - expense */
  --color-bg:          oklch(0.98 0.005 75);   /* warm white */
  --color-surface:     oklch(1.00 0 0);
  --color-border:      oklch(0.88 0.01 75);
  --color-foreground:  oklch(0.18 0.02 270);
  --color-muted:       oklch(0.55 0.01 270);
  /* Typography */
  --font-latin:   "Rubik", system-ui, sans-serif;   /* also has Arabic subset */
  --font-arabic:  "Noto Kufi Arabic", "Rubik", sans-serif;
  --min-font-size: 16px;     /* NEVER go below this — readability requirement */
  --radius-card:  0.875rem;
}
```

## Critical Rules for Kasb
- **Minimum tap target: 48px** — no exceptions. This is a mobile-first app for users not used to small touch targets.
- **Income = green, Expense = red** — always and everywhere. No creative reuse of these colors.
- **Amount font-size: ≥ 20px** — money amounts must be immediately readable.
- **No icons without labels** — every icon has a text label. Never icon-only actions.
- **Large + / - buttons**: home screen hero buttons are at least 64px tall.
- **Bottom navigation**: thumb-reachable on all phones. 4 tabs max.

## Home Screen Pattern
```
┌─────────────────────────────────┐
│  Balance aujourd'hui            │  ← summary bar
│  +1,200 MAD                     │  ← large number, green
├─────────────────────────────────┤
│  [  + Vente  ]  [  - Dépense  ] │  ← hero buttons, 64px+
├─────────────────────────────────┤
│  Entrées récentes               │
│  ├ 📦 Vente    +150 MAD  10:23  │
│  ├ 🛒 Achat    -80 MAD   09:15  │
│  └ 📦 Vente    +200 MAD  08:45  │
└─────────────────────────────────┘
│  Accueil  Dettes  Score  Plus   │  ← bottom nav
```
