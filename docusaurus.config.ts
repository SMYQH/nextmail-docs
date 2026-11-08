import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const DEFAULT_SITE_URL = 'https://docs.nextmail.app';

/**
 * 站点公开地址来自 `.env.deploy`（由 `scripts/deploy-env.mjs` 读入进程环境），
 * CI 则使用同名 GitHub Actions Variable。
 */
const siteUrl = (process.env.DOCS_SITE_URL ?? '').trim();

if (siteUrl && !/^https?:\/\/\S+$/.test(siteUrl)) {
  throw new Error(
    `DOCS_SITE_URL must be an absolute http(s) URL, got: ${siteUrl}`,
  );
}

/**
 * NextMail documentation site.
 *
 * Locales:
 * - `en` is the default locale and serves the site from `/`.
 * - `zh-CN` is served from `/zh-CN/`.
 *
 * Versioning is reserved: `docs/` holds the unreleased content, while
 * `versioned_docs/` + `versions.json` are kept ready for `docusaurus docs:version`.
 */
const config: Config = {
  title: 'NextMail',
  tagline: 'Self-hosted temporary email on Cloudflare — OpenAPI-first.',
  favicon: 'img/logo.png',

  url: siteUrl || DEFAULT_SITE_URL,
  baseUrl: '/',

  organizationName: 'SMYQH',
  projectName: 'nextmail-docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },
  onDuplicateRoutes: 'throw',


  /**
   * Both locales are served under an explicit path prefix:
   * - English  -> /en/
   * - Chinese  -> /zh-CN/
   *
   * Per-locale `baseUrl` is supported since Docusaurus v3.9, so the default
   * locale does not have to live at the site root.
   */
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
    localeConfigs: {
      en: {
        label: 'English',
        htmlLang: 'en',
        baseUrl: '/en/',
      },
      'zh-CN': {
        label: '简体中文',
        htmlLang: 'zh-CN',
        baseUrl: '/zh-CN/',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/SMYQH/nextmail-docs/edit/main/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: ['./src/css/fluent-tokens.css', './src/css/custom.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        searchResultLimits: 12,
        searchBarShortcut: true,
        searchBarShortcutHint: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    metadata: [
      {
        name: 'keywords',
        content:
          'NextMail, temporary email, Cloudflare, Workers, D1, OpenAPI, webhook',
      },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'NextMail',
      logo: {
        alt: 'NextMail',
        src: 'img/logo.svg',
        srcDark: 'img/logo.svg',
        width: 28,
        height: 28,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/SMYQH/nextmail',
          position: 'right',
          className: 'navbar__github',
          'aria-label': 'NextMail on GitHub',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting started', to: '/getting-started/overview' },
            { label: 'Guides', to: '/guides/webhooks' },
            { label: 'Developers', to: '/developers/architecture' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'Application', href: 'https://github.com/SMYQH/nextmail' },
            { label: 'Documentation', href: 'https://github.com/SMYQH/nextmail-docs' },
            { label: 'Issues', href: 'https://github.com/SMYQH/nextmail/issues' },
          ],
        },
        {
          title: 'Upstream',
          items: [
            { label: 'MoeMail', href: 'https://github.com/beilunyang/moemail' },
            { label: 'MoeMail docs', href: 'https://docs.moemail.app' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} NextMail. Licensed under AGPL-3.0.`,
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
      additionalLanguages: [
        'bash',
        'powershell',
        'json',
        'yaml',
        'diff',
        'ini',
        'http',
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
