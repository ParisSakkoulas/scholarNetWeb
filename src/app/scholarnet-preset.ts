import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * scholarNet preset — built on Aura, re-tokened to match scholarNet-tokens.css.
 * The 50–950 "primary" ramp needs real distinct values (PrimeNG uses it for
 * hover/active math), so those are literal oklch steps anchored on --oxford
 * at 700. Everything that's a single, final value (not part of a ramp) is
 * wired directly to the CSS custom properties so tokens.css stays the one
 * source of truth — change a color there and the whole app follows.
 */
export const ScholarNetPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0px',
      xs: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
    },
  },
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: 'var(--oxblood)',
      offset: '2px',
    },

    primary: {
      50: 'oklch(0.97 0.01 250)',
      100: 'oklch(0.93 0.02 250)',
      200: 'oklch(0.86 0.035 250)',
      300: 'oklch(0.76 0.05 250)',
      400: 'oklch(0.64 0.06 250)',
      500: 'oklch(0.52 0.07 250)',
      600: 'oklch(0.42 0.075 250)',
      700: 'oklch(0.32 0.07 250)' /* = --oxford exactly */,
      800: 'oklch(0.26 0.06 250)',
      900: 'oklch(0.20 0.05 250)',
      950: 'oklch(0.15 0.04 250)',
    },
    colorScheme: {
      light: {
        primary: {
          color: 'var(--ink)' /* your .btn is solid ink, not oxford */,
          inverseColor: 'var(--paper)',
          hoverColor: 'var(--ink-2)',
          activeColor: 'var(--ink-2)',
        },
        surface: {
          0: 'var(--paper)',
          50: 'var(--paper)',
          100: 'var(--paper-2)',
          200: 'var(--paper-3)',
          300: 'var(--rule)',
          400: 'oklch(0.72 0.015 85)',
          500: 'var(--ink-3)',
          600: 'oklch(0.42 0.02 250)',
          700: 'var(--ink-2)',
          800: 'oklch(0.27 0.02 250)',
          900: 'var(--ink)',
          950: 'oklch(0.16 0.015 250)',
        },
        formField: {
          background: '#ffffff',
          hoverBackground: '#ffffff',
          filledBackground: '#ffffff',
          borderColor: 'var(--ink)',
          hoverBorderColor: 'var(--ink)',
          focusBorderColor: 'var(--oxblood)',
          borderRadius: '0px',
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
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: { borderRadius: '0px' },
        },
      },
    },
    inputtext: {
      colorScheme: {
        light: {
          root: { borderRadius: '0px' },
        },
      },
    },

    select: {
      colorScheme: {
        light: {
          root: {
            borderRadius: '0px',
          },
          overlay: {
            background: '#ffffff',
            borderColor: 'var(--rule)',
            borderRadius: '0px',
          },
          option: {
            selectedBackground: 'var(--oxford)',
            selectedColor: 'var(--paper)',
            focusBackground: 'var(--paper-2)',
            focusColor: 'var(--ink)',
          },
        },
      },
    },
    togglebutton: {
      colorScheme: {
        light: {
          root: {
            borderRadius: '0px',
            background: '#ffff',
            borderColor: 'var(--rule)',
            color: 'var(--ink-2)',
            hoverBackground: 'var(--paper-2)',
            hoverBorderColor: 'var(--ink-3)',
            checkedBackground: 'var(--oxford)',
            checkedBorderColor: '#ffff',
            checkedColor: 'var(--paper)',
          },
          content: {
            checkedBackground: 'var(--oxford)',
          },
        },
      },
    },
  },
});
