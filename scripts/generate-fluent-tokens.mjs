/**
 * Generates `src/css/fluent-tokens.css` from the official Fluent 2 token
 * objects shipped by `@fluentui/react-theme`.
 *
 * The site never hard-codes Fluent colours: every accent, surface, stroke,
 * radius, duration and easing curve below is copied from the official
 * library, so upgrading the dependency upgrades the theme.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { webDarkTheme, webLightTheme } from '@fluentui/react-theme';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../src/css/fluent-tokens.css');

/** CSS custom property name -> official Fluent token name. */
const tokens = {
  '--fluent-color-brand-background': 'colorBrandBackground',
  '--fluent-color-brand-background-hover': 'colorBrandBackgroundHover',
  '--fluent-color-brand-background-pressed': 'colorBrandBackgroundPressed',
  '--fluent-color-brand-background-secondary': 'colorBrandBackground2',
  '--fluent-color-brand-foreground': 'colorBrandForeground1',
  '--fluent-color-brand-foreground-link': 'colorBrandForegroundLink',
  '--fluent-color-brand-foreground-link-hover': 'colorBrandForegroundLinkHover',
  '--fluent-color-on-brand': 'colorNeutralForegroundOnBrand',
  '--fluent-color-compound-brand-foreground': 'colorCompoundBrandForeground1',

  '--fluent-color-surface': 'colorNeutralBackground1',
  '--fluent-color-surface-alt': 'colorNeutralBackground2',
  '--fluent-color-surface-layer': 'colorNeutralBackground3',
  '--fluent-color-surface-subtle': 'colorSubtleBackgroundHover',
  '--fluent-color-surface-hover': 'colorNeutralBackground1Hover',
  '--fluent-color-surface-pressed': 'colorNeutralBackground1Pressed',
  '--fluent-color-surface-selected': 'colorNeutralBackground1Selected',
  '--fluent-color-card-background': 'colorNeutralCardBackground',
  '--fluent-color-card-background-hover': 'colorNeutralCardBackgroundHover',

  '--fluent-color-text': 'colorNeutralForeground1',
  '--fluent-color-text-secondary': 'colorNeutralForeground2',
  '--fluent-color-text-tertiary': 'colorNeutralForeground3',
  '--fluent-color-text-disabled': 'colorNeutralForegroundDisabled',

  '--fluent-color-stroke': 'colorNeutralStroke1',
  '--fluent-color-stroke-subtle': 'colorNeutralStroke2',
  '--fluent-color-stroke-thicker': 'colorNeutralStroke3',
  '--fluent-color-stroke-accessible': 'colorNeutralStrokeAccessible',
  '--fluent-color-stroke-inverse': 'colorNeutralStrokeOnBrand',

  '--fluent-color-background-overlay': 'colorBackgroundOverlay',
  '--fluent-color-warning-background': 'colorPaletteYellowBackground1',
  '--fluent-color-warning-border': 'colorPaletteYellowBorder1',
  '--fluent-color-danger-background': 'colorPaletteRedBackground1',
  '--fluent-color-danger-border': 'colorPaletteRedBorder1',

  '--fluent-radius-small': 'borderRadiusSmall',
  '--fluent-radius-medium': 'borderRadiusMedium',
  '--fluent-radius-large': 'borderRadiusLarge',
  '--fluent-radius-xlarge': 'borderRadiusXLarge',
  '--fluent-radius-circular': 'borderRadiusCircular',

  '--fluent-font-family-base': 'fontFamilyBase',
  '--fluent-font-family-mono': 'fontFamilyMonospace',
  '--fluent-font-size-100': 'fontSizeBase100',
  '--fluent-font-size-200': 'fontSizeBase200',
  '--fluent-font-size-300': 'fontSizeBase300',
  '--fluent-font-size-400': 'fontSizeBase400',
  '--fluent-font-size-500': 'fontSizeBase500',
  '--fluent-font-size-600': 'fontSizeBase600',
  '--fluent-font-size-hero-700': 'fontSizeHero700',
  '--fluent-font-size-hero-800': 'fontSizeHero800',
  '--fluent-font-size-hero-900': 'fontSizeHero900',
  '--fluent-font-weight-regular': 'fontWeightRegular',
  '--fluent-font-weight-medium': 'fontWeightMedium',
  '--fluent-font-weight-semibold': 'fontWeightSemibold',
  '--fluent-font-weight-bold': 'fontWeightBold',
  '--fluent-line-height-base': 'lineHeightBase300',
  '--fluent-line-height-large': 'lineHeightBase400',

  '--fluent-duration-fast': 'durationFast',
  '--fluent-duration-normal': 'durationNormal',
  '--fluent-duration-gentle': 'durationGentle',
  '--fluent-duration-slow': 'durationSlow',
  '--fluent-curve-easy-ease': 'curveEasyEase',
  '--fluent-curve-accelerate-max': 'curveAccelerateMax',
  '--fluent-curve-decelerate-max': 'curveDecelerateMax',

  '--fluent-shadow-2': 'shadow2',
  '--fluent-shadow-4': 'shadow4',
  '--fluent-shadow-8': 'shadow8',
  '--fluent-shadow-16': 'shadow16',
  '--fluent-shadow-64': 'shadow64',

  '--fluent-stroke-width-thin': 'strokeWidthThin',
  '--fluent-stroke-width-thick': 'strokeWidthThick',
};

const spacing = {
  '--fluent-space-xxs': 'spacingHorizontalXXS',
  '--fluent-space-xs': 'spacingHorizontalXS',
  '--fluent-space-s': 'spacingHorizontalS',
  '--fluent-space-m': 'spacingHorizontalM',
  '--fluent-space-l': 'spacingHorizontalL',
  '--fluent-space-xl': 'spacingHorizontalXL',
  '--fluent-space-xxl': 'spacingHorizontalXXL',
};

const readTheme = (theme, map) => {
  const lines = [];
  for (const [cssName, tokenName] of Object.entries(map)) {
    const value = theme[tokenName];
    if (value === undefined || value === null) {
      throw new Error(`Fluent token "${tokenName}" is missing from the official theme`);
    }
    lines.push(`  ${cssName}: ${value};`);
  }
  return lines.join('\n');
};

const light = readTheme(webLightTheme, { ...tokens, ...spacing });
const dark = readTheme(webDarkTheme, { ...tokens, ...spacing });

const css = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: @fluentui/react-theme (webLightTheme / webDarkTheme).
 * Regenerate with: npm run tokens:generate
 */

:root {
  color-scheme: light;
${light}
}

[data-theme='dark'] {
  color-scheme: dark;
${dark}
}
`;

writeFileSync(outputPath, css, 'utf8');
console.log(`Generated ${outputPath}`);
