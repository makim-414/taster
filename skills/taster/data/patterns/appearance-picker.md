---
id: appearance-picker
name: Appearance picker
category: form-input
uses: [set-the-visual-foundation, switch-views]
surfaces: [app, dashboard]
replaces: [CMP-11]
components: [blocks/appearance-picker]
inspiration: []
status: stable
---

## When to use

Use it when light and dark are a large part of the service: people spend hours in it, or the mode changes how they read data. It sits on the settings page and offers three choices, light, dark and system, each with a small picture of the result, so nobody has to guess what they will get.

For a marketing page or a small tool, a plain switch in the header from `token-themes` is enough. Both can live in one product as long as they write the same stored value.

## Anatomy

- A fieldset with a legend and three radio inputs. It is one choice out of three, so it is a radio group, not three buttons.
- Each option is a whole-card hit area with a picture and a short word below it.
- The picture is a tiny screen built from the same tokens as the page (`.theme-light`, `.theme-dark`), so it shows the real brand.
- System is split on the diagonal: light in one half, dark in the other.
- Selected state: a 2px ring in `--brand` and a heavier label, so it does not depend on color alone.
- Storage: one key, read by an inline script in `<head>` (`appearanceInitScript`) so the stored mode paints first.

## Do

- Follow the device on a first visit, and keep following it while the choice is system.
- Reserve the space on first render. The stored choice arrives after mount, and the section should not jump.
- Test every screen in both modes before offering the choice, including charts and focus rings.
- Pass `labels` and `legend` for other languages, and `value` with `onValueChange` when a theme library owns the state.

## Don't

- Do not hide the section until mount and return nothing. It makes the settings page jump.
- Do not hardcode hex previews. They drift from the product as soon as the brand changes.
- Do not mark the selected card with a colored ring alone (use `--brand` and the heavier label), and do not add a glow.
- Do not offer the picker while one mode is half finished. Fix the mode first (CMP-11).

## Swap recipe

Slop: dark only, or one icon button that cycles three states with no way to see them.

```tsx
<button onClick={cycleTheme} aria-label="Theme"><MoonIcon /></button>
```

Fixed: three visible choices on the settings page.

```tsx
import { AppearancePicker, appearanceInitScript } from './blocks/appearance-picker'

// layout <head>
<script dangerouslySetInnerHTML={{ __html: appearanceInitScript() }} />

// settings page
<AppearancePicker legend="화면 테마" labels={{ light: '라이트', dark: '다크', system: '시스템' }} />
```

## Tokens

`--bg`, `--bg-sunken`, `--border`, `--text`, `--text-muted`, `--text-subtle`, `--brand`, `--ring`, `--r-sm`, `--r-md`, `--sp-3`, `--t-body`, `--t-sm`, `--w-med`, `--w-semi`, `--dur-dropdown`, `--ease-out`. Needs `tokens.css` and `themes/light.css`.
