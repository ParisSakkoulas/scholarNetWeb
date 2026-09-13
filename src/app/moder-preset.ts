import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * scholarNet — Modern preset
 * Palette: #30AFFF (primary blue), #92EEFF (cyan accent),
 *          #D8FFC5 (mint light), #C4F7CA (mint success)
 *
 * Shape language: soft, rounded, modern SaaS feel — generous radii,
 * pill-shaped tags/toggles, subtle shadows on cards.
 */
export const ModernPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0px',
      xs: '6px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
    },
  },

  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '#30AFFF',
      offset: '2px',
    },

    primary: {
      50: '#EAF7FF',
      100: '#D2EFFF',
      200: '#A8E4FF',
      300: '#7DD8FF',
      400: '#52CCFF',
      500: '#30AFFF', // base
      600: '#1E8FDB',
      700: '#1670B0',
      800: '#105386',
      900: '#0A3B61',
      950: '#062540',
    },

    colorScheme: {
      light: {
        primary: {
          color: '#30AFFF',
          inverseColor: '#FFFFFF',
          hoverColor: '#1E8FDB',
          activeColor: '#1670B0',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FBFF',
          100: '#EFF6FC',
          200: '#E2EEF7',
          300: '#CBDCE8',
          400: '#A8BFCF',
          500: '#8098AA',
          600: '#5E7688',
          700: '#445A6B',
          800: '#2E3F4D',
          900: '#1B2733',
          950: '#0F1721',
        },
        formField: {
          background: '#FFFFFF',
          hoverBackground: '#FFFFFF',
          filledBackground: '#F8FBFF',
          borderColor: '#E2EEF7',
          hoverBorderColor: '#A8E4FF',
          focusBorderColor: '#30AFFF',
          borderRadius: '{primitive.borderRadius.md}',
        },
        content: {
          background: '#FFFFFF',
          borderColor: '#E2EEF7',
        },
        text: {
          color: '#1B2733',
          mutedColor: '#5E7688',
        },
      },

      dark: {
        primary: {
          color: '#52CCFF',
          inverseColor: '#0A3B61',
          hoverColor: '#7DD8FF',
          activeColor: '#A8E4FF',
        },
        surface: {
          0: '#0F1721',
          50: '#1B2733',
          100: '#22303D',
          200: '#2E3F4D',
          300: '#445A6B',
          400: '#5E7688',
          500: '#8098AA',
          600: '#A8BFCF',
          700: '#CBDCE8',
          800: '#E2EEF7',
          900: '#F8FBFF',
          950: '#FFFFFF',
        },
        formField: {
          background: '#1B2733',
          hoverBackground: '#22303D',
          filledBackground: '#22303D',
          borderColor: '#2E3F4D',
          hoverBorderColor: '#445A6B',
          focusBorderColor: '#52CCFF',
          borderRadius: '{primitive.borderRadius.md}',
        },
        content: {
          background: '#1B2733',
          borderColor: '#2E3F4D',
        },
        text: {
          color: '#F8FBFF',
          mutedColor: '#A8BFCF',
        },
      },
    },
  },

  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            borderRadius: '{primitive.borderRadius.lg}',
          },
        },
        dark: {
          root: {
            borderRadius: '{primitive.borderRadius.lg}',
          },
        },
      },
    },

    inputtext: {
      colorScheme: {
        light: { root: { borderRadius: '{primitive.borderRadius.md}' } },
        dark: { root: { borderRadius: '{primitive.borderRadius.md}' } },
      },
    },

    textarea: {
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
            background: '#FFFFFF',
            borderColor: '#E2EEF7',
            borderRadius: '{primitive.borderRadius.md}',
          },
          option: {
            selectedBackground: '#EAF7FF',
            selectedColor: '#0A3B61',
            focusBackground: '#F8FBFF',
            focusColor: '#1B2733',
          },
        },
        dark: {
          root: { borderRadius: '{primitive.borderRadius.md}' },
          overlay: {
            background: '#1B2733',
            borderColor: '#2E3F4D',
            borderRadius: '{primitive.borderRadius.md}',
          },
          option: {
            selectedBackground: '#22303D',
            selectedColor: '#52CCFF',
            focusBackground: '#22303D',
            focusColor: '#F8FBFF',
          },
        },
      },
    },

    datepicker: {
      colorScheme: {
        light: {
          panel: {
            background: '#FFFFFF',
            borderColor: '#E2EEF7',
            borderRadius: '{primitive.borderRadius.lg}',
          },
          date: {
            selectedBackground: '#30AFFF',
            selectedColor: '#FFFFFF',
            hoverBackground: '#EAF7FF',
          },
        },
        dark: {
          panel: {
            background: '#1B2733',
            borderColor: '#2E3F4D',
            borderRadius: '{primitive.borderRadius.lg}',
          },
          date: {
            selectedBackground: '#30AFFF',
            selectedColor: '#0A3B61',
            hoverBackground: '#22303D',
          },
        },
      },
    },

    togglebutton: {
      colorScheme: {
        light: {
          root: {
            borderRadius: '{primitive.borderRadius.xl}',
            background: '#F8FBFF',
            borderColor: '#E2EEF7',
            color: '#5E7688',
            hoverBackground: '#EFF6FC',
            hoverBorderColor: '#A8E4FF',
            checkedBackground: '#30AFFF',
            checkedBorderColor: '#30AFFF',
            checkedColor: '#FFFFFF',
          },
          content: { checkedBackground: '#30AFFF' },
        },
        dark: {
          root: {
            borderRadius: '{primitive.borderRadius.xl}',
            background: '#1B2733',
            borderColor: '#2E3F4D',
            color: '#A8BFCF',
            hoverBackground: '#22303D',
            hoverBorderColor: '#445A6B',
            checkedBackground: '#30AFFF',
            checkedBorderColor: '#30AFFF',
            checkedColor: '#0A3B61',
          },
          content: { checkedBackground: '#30AFFF' },
        },
      },
    },

    card: {
      colorScheme: {
        light: {
          root: {
            background: '#FFFFFF',
            borderRadius: '{primitive.borderRadius.xl}',
            shadow:
              '0 1px 2px rgba(27, 39, 51, 0.04), 0 4px 12px rgba(27, 39, 51, 0.06)',
          },
        },
        dark: {
          root: {
            background: '#1B2733',
            borderRadius: '{primitive.borderRadius.xl}',
            shadow:
              '0 1px 2px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },

    dialog: {
      colorScheme: {
        light: {
          root: {
            background: '#FFFFFF',
            borderRadius: '{primitive.borderRadius.xl}',
          },
        },
        dark: {
          root: {
            background: '#1B2733',
            borderRadius: '{primitive.borderRadius.xl}',
          },
        },
      },
    },

    tag: {
      colorScheme: {
        light: {
          primary: { color: '#0A3B61', background: '#D2EFFF' },
          info: { color: '#0A3B61', background: '#92EEFF' },
          success: { color: '#1E5B2C', background: '#C4F7CA' },
          warn: { color: '#6B4B00', background: '#FFE9A8' },
          danger: { color: '#7A1F1F', background: '#FFD2D2' },
          secondary: { color: '#445A6B', background: '#E2EEF7' },
        },
        dark: {
          primary: { color: '#D2EFFF', background: '#105386' },
          info: { color: '#0A3B61', background: '#92EEFF' },
          success: { color: '#0F2E17', background: '#7ED991' },
          warn: { color: '#3D2A00', background: '#FFD866' },
          danger: { color: '#FFD2D2', background: '#7A1F1F' },
          secondary: { color: '#CBDCE8', background: '#2E3F4D' },
        },
      },
    },

    avatar: {
      colorScheme: {
        light: {
          root: { background: '#D2EFFF', color: '#0A3B61' },
        },
        dark: {
          root: { background: '#105386', color: '#D2EFFF' },
        },
      },
    },

    skeleton: {
      colorScheme: {
        light: { root: { background: '#EFF6FC' } },
        dark: { root: { background: '#22303D' } },
      },
    },
  },
});
