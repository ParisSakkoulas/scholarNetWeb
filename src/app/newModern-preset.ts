import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * scholarNet preset — built on Aura, tokened against the ink / paper / oxford
 * palette in styles.css (Source Serif 4 + IBM Plex Sans).
 *
 * Primary color and button colors are now both governed here — the raw
 * --p-button-primary-* overrides in styles.css have been removed so this
 * file is the single source of truth for button color, as intended.
 *
 * Shape language: structural surfaces (cards, inputs) keep a moderate
 * radius; buttons go fully square (`borderRadius.none`) via
 * --p-button-border-radius: 0 in styles.css, mirrored here too.
 */
export const NewPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0px',
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
    },
  },
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: 'var(--oxford)',
      offset: '2px',
    },

    primary: {
      50: 'oklch(0.95 0.015 250)',
      100: 'oklch(0.89 0.03 250)',
      200: 'oklch(0.80 0.05 250)',
      300: 'oklch(0.68 0.065 250)',
      400: 'oklch(0.56 0.075 250)',
      500: 'oklch(0.32 0.07 250)' /* = --oxford exactly */,
      600: 'oklch(0.28 0.065 250)',
      700: 'oklch(0.24 0.055 250)',
      800: 'oklch(0.20 0.045 250)',
      900: 'oklch(0.16 0.035 250)',
      950: 'oklch(0.12 0.025 250)',
    },

    colorScheme: {
      light: {
        primary: {
          color: 'var(--oxford)',
          inverseColor: 'var(--paper)',
          hoverColor: 'var(--oxford-hover)',
          activeColor: 'var(--oxford-hover)',
        },
        surface: {
          0: 'var(--paper)',
          50: 'var(--paper)',
          100: 'var(--paper-2)',
          200: 'var(--paper-3)',
          300: 'var(--rule)',
          400: 'oklch(0.78 0.02 60)',
          500: 'var(--ink-3)',
          600: 'oklch(0.42 0.025 40)',
          700: 'var(--ink-2)',
          800: 'oklch(0.27 0.03 40)',
          900: 'var(--ink)',
          950: 'oklch(0.16 0.02 40)',
        },
        formField: {
          background: 'var(--paper)',
          hoverBackground: 'var(--paper)',
          filledBackground: 'var(--paper-2)',
          borderColor: 'var(--rule)',
          hoverBorderColor: 'var(--ink-3)',
          focusBorderColor: 'var(--oxford)',
          borderRadius: '{primitive.borderRadius.md}',
        },
        content: {
          background: 'var(--paper)',
          borderColor: 'var(--rule)',
        },
        text: {
          color: 'var(--ink)',
          mutedColor: 'var(--ink-3)',
        },
      },

      dark: {
        primary: {
          color: 'var(--oxford)',
          inverseColor: 'var(--paper)',
          hoverColor: 'var(--oxford-hover)',
          activeColor: 'var(--oxford-hover)',
        },
        surface: {
          0: 'var(--paper)',
          50: 'var(--paper)',
          100: 'var(--paper-2)',
          200: 'var(--paper-3)',
          300: 'var(--rule)',
          400: 'oklch(0.50 0.02 40)',
          500: 'var(--ink-3)',
          600: 'oklch(0.78 0.015 65)',
          700: 'var(--ink-2)',
          800: 'oklch(0.91 0.012 68)',
          900: 'var(--ink)',
          950: 'oklch(0.98 0.01 70)',
        },
        formField: {
          background: 'var(--paper-2)',
          hoverBackground: 'var(--paper-2)',
          filledBackground: 'var(--paper-3)',
          borderColor: 'var(--rule)',
          hoverBorderColor: 'var(--ink-3)',
          focusBorderColor: 'var(--oxford)',
          borderRadius: '{primitive.borderRadius.md}',
        },
        content: {
          background: 'var(--paper-2)',
          borderColor: 'var(--rule)',
        },
        text: {
          color: 'var(--ink)',
          mutedColor: 'var(--ink-3)',
        },
      },
    },
  },

  components: {
    button: {
      colorScheme: {
        light: { root: { borderRadius: '{primitive.borderRadius.none}' } },
        dark: { root: { borderRadius: '{primitive.borderRadius.none}' } },
      },
    },
    inputtext: {
      colorScheme: {
        light: { root: { borderRadius: '{primitive.borderRadius.md}' } },
        dark: { root: { borderRadius: '{primitive.borderRadius.md}' } },
      },
    },
    select: {
      colorScheme: {
        light: {
          root: { borderRadius: '{primitive.borderRadius.md}' },
          overlay: {
            background: 'var(--paper)',
            borderColor: 'var(--rule)',
            borderRadius: '{primitive.borderRadius.md}',
          },
          option: {
            selectedBackground: 'var(--oxford)',
            selectedColor: 'var(--paper)',
            focusBackground: 'var(--paper-2)',
            focusColor: 'var(--ink)',
          },
        },
        dark: {
          root: { borderRadius: '{primitive.borderRadius.md}' },
          overlay: {
            background: 'var(--paper-2)',
            borderColor: 'var(--rule)',
            borderRadius: '{primitive.borderRadius.md}',
          },
          option: {
            selectedBackground: 'var(--oxford)',
            selectedColor: 'var(--paper)',
            focusBackground: 'var(--paper-3)',
            focusColor: 'var(--ink)',
          },
        },
      },
    },
    togglebutton: {
      colorScheme: {
        light: {
          root: {
            borderRadius: '{primitive.borderRadius.md}',
            background: 'var(--paper)',
            borderColor: 'var(--rule)',
            color: 'var(--ink-2)',
            hoverBackground: 'var(--paper-2)',
            hoverBorderColor: 'var(--ink-3)',
            checkedBackground: 'var(--oxford)',
            checkedBorderColor: 'var(--oxford)',
            checkedColor: 'var(--paper)',
          },
          content: { checkedBackground: 'var(--oxford)' },
        },
        dark: {
          root: {
            borderRadius: '{primitive.borderRadius.md}',
            background: 'var(--paper-2)',
            borderColor: 'var(--rule)',
            color: 'var(--ink-2)',
            hoverBackground: 'var(--paper-3)',
            hoverBorderColor: 'var(--ink-3)',
            checkedBackground: 'var(--oxford)',
            checkedBorderColor: 'var(--oxford)',
            checkedColor: 'var(--paper)',
          },
          content: { checkedBackground: 'var(--oxford)' },
        },
      },
    },

    card: {
      colorScheme: {
        light: {
          root: {
            background: 'var(--paper)',
            borderRadius: '{primitive.borderRadius.lg}',
          },
        },
        dark: {
          root: {
            background: 'var(--paper-2)',
            borderRadius: '{primitive.borderRadius.lg}',
          },
        },
      },
    },

    tag: {
      colorScheme: {
        light: {
          primary: { color: 'var(--paper)', background: 'var(--oxford)' },
          success: { color: 'var(--paper)', background: 'var(--forest)' },
          danger: { color: 'var(--paper)', background: 'var(--oxblood)' },
          warn: { color: 'var(--ink)', background: 'var(--ochre)' },
        },
        dark: {
          primary: { color: 'var(--paper)', background: 'var(--oxford)' },
          success: { color: 'var(--paper)', background: 'var(--forest)' },
          danger: { color: 'var(--paper)', background: 'var(--oxblood)' },
          warn: { color: 'var(--ink)', background: 'var(--ochre)' },
        },
      },
    },
  },
});
