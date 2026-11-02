/**
 * Tailwind v3 preset that maps utility classes to the CSS variables in tokens.css.
 * Components use classes like bg-bg-elev, text-text-muted, border-border-soft, text-label.
 * Because every class points at a variable, a theme is one stylesheet, not a rebuild.
 *
 *   // tailwind.config.cjs
 *   module.exports = { presets: [require('./src/tailwind-preset.cjs')], content: [...] }
 */
module.exports = {
  theme: {
    // desk: a wide screen without a coarse pointer. Controls are 44px everywhere else and shrink only here
    // (desk:h-9). Do not test pointer: fine instead: a headless browser reports no pointer at all.
    screens: {
      sm: '640px', md: '768px', lg: '1024px', xl: '1280px',
      desk: { raw: '(min-width: 1024px) and (not (pointer: coarse))' },
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        'bg-sunken': 'var(--bg-sunken)',
        'bg-popover': 'var(--popover)',
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        'border-input': 'var(--input)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        'accent-soft': 'var(--accent-soft)',
        highlight: 'var(--highlight)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info: 'var(--info)',
        ring: 'var(--ring)',
        sidebar: 'var(--sidebar)',
        'sidebar-border': 'var(--sidebar-border)',
        'delta-up': 'var(--delta-up)',
        'delta-down': 'var(--delta-down)',
        scrim: 'var(--scrim)',
        'on-scrim': 'var(--on-scrim)',
        'on-scrim-muted': 'var(--on-scrim-muted)',
        'on-scrim-ink': 'var(--on-scrim-ink)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)',
        },
      },
      fontFamily: {
        sans: ['var(--font)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display, var(--font))'],
      },
      fontSize: {
        // The stock text-sm (14px) stays untouched. text-xs and the small token sizes read the --t-* variables,
        // so a Korean page (lang="ko") gets 13px from tokens.css without a rebuild.
        xs: ['var(--t-sm)', { lineHeight: '1rem' }],
        display: ['var(--t-display, 36px)', { lineHeight: '1.1' }],
        h1: ['var(--t-h1, 30px)', { lineHeight: '1.1' }],
        h2: ['var(--t-h2, 24px)', { lineHeight: '1.3' }],
        title: ['var(--t-title, 16px)', { lineHeight: '1.3' }],
        body: ['var(--t-body, 14px)', { lineHeight: '1.5' }],
        label: ['var(--t-sm)', { lineHeight: '1.5' }],
        caption: ['var(--t-xs)', { lineHeight: '1.5' }],
        micro: ['var(--t-micro)', { lineHeight: '1.5' }],
      },
      fontWeight: { reg: '400', med: 'var(--w-med, 500)', semi: 'var(--w-semi, 600)' },
      // Spacing and type read the tokens, so the design system's density and type-expression axes reshape every
      // component. The fallbacks are the default steps from tokens.css.
      spacing: {
        1: 'var(--sp-1, 4px)', 2: 'var(--sp-2, 8px)', 3: 'var(--sp-3, 12px)', 4: 'var(--sp-4, 16px)',
        5: 'var(--sp-5, 20px)', 6: 'var(--sp-6, 24px)', 8: 'var(--sp-8, 32px)', 12: 'var(--sp-12, 48px)', 16: 'var(--sp-16, 64px)',
      },
      borderRadius: {
        sm: 'calc(var(--radius) * 0.6)',
        md: 'calc(var(--radius) * 0.8)',
        lg: 'var(--radius)',
        card: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.4)',
        '2xl': 'calc(var(--radius) * 1.8)',
        '3xl': 'calc(var(--radius) * 2.2)',
        '4xl': 'calc(var(--radius) * 2.6)',
        pill: '999px',
      },
      boxShadow: { card: 'var(--sh-card)', pop: 'var(--sh-pop)' },
      // ease-in is intentionally not exposed, it is not used for UI.
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        drawer: 'var(--ease-drawer)',
      },
      transitionDuration: {
        press: 'var(--dur-press)',
        tooltip: 'var(--dur-tooltip)',
        dropdown: 'var(--dur-dropdown)',
        modal: 'var(--dur-modal)',
      },
      scale: { press: 'var(--press-scale)', enter: 'var(--enter-scale)' },
    },
  },
}
