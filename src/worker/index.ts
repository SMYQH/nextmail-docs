/**
 * Cloudflare Worker — 文档站入口。
 *
 * 文档站是纯静态产物（Docusaurus SSG），但站点根路径 `/` 属于站点本身而不属于
 * 任何语言（英文在 `/en/`，中文在 `/zh-CN/`），因此 Docusaurus 不会为根路径生成
 * 文件。这个 Worker 负责：
 *
 * 1. `/` —— 按 `Accept-Language` 返回 302 跳转到 `/en/` 或 `/zh-CN/`；
 * 2. `/languages` —— 展示手动选择语言的页面（`Accept-Language` 缺失或用户想换语言时）；
 * 3. 其余所有路径 —— 直接交给静态资源处理，不产生额外开销。
 *
 * 静态资源优先由 Cloudflare 的 Assets 服务处理，Worker 只会收到未命中资源的请求。
 */

/**
 * 静态资源绑定。
 *
 * 这里使用最小的结构化类型，而不是引入 `@cloudflare/workers-types`：本 Worker
 * 只用到 `fetch` 这一个方法，没有必要为它增加一个依赖。
 */
interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS: AssetFetcher;
}

/** 支持的语言及其公开路径。 */
const LOCALES = [
  { code: 'zh-CN', prefix: '/zh-CN/', label: '简体中文', english: 'Simplified Chinese' },
  { code: 'en', prefix: '/en/', label: 'English', english: 'English' },
] as const;

/**
 * 从 `Accept-Language` 头推断首选语言。
 *
 * 解析时会考虑 q 值权重，并跳过通配符 `*`——它不代表用户偏好任何具体语言。
 */
function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) {
    return 'en';
  }

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='))
        ?.slice(2);

      const parsed = quality ? Number.parseFloat(quality) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(parsed) ? 0 : parsed };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of ranked) {
    if (entry.tag === 'zh' || entry.tag.startsWith('zh-')) {
      return 'zh-CN';
    }
    if (entry.tag === 'en' || entry.tag.startsWith('en-')) {
      return 'en';
    }
  }

  // 只有通配符或无法识别的语言时，回退到默认语种。
  return 'en';
}

function findLocale(code: string): (typeof LOCALES)[number] {
  return LOCALES.find((locale) => locale.code === code) ?? LOCALES[1];
}

function redirectTo(path: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: path,
      'Cache-Control': 'no-store',
    },
  });
}

/** 渲染站点根路径下的 404 页面。 */
function renderNotFoundPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 — NextMail 文档</title>
    <link rel="icon" href="/img/logo.png" />
    <style>
      :root {
        color-scheme: light dark;
        --surface: #ffffff;
        --surface-alt: #fafafa;
        --text: #242424;
        --text-secondary: #424242;
        --stroke: #d1d1d1;
        --brand: #0f6cbd;
        --brand-hover: #115ea3;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --surface: #1b1a19;
          --surface-alt: #201f1e;
          --text: #f3f2f1;
          --text-secondary: #d2d0ce;
          --stroke: #484644;
          --brand: #2886de;
          --brand-hover: #479ef5;
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px 20px;
        background: var(--surface-alt);
        color: var(--text);
        font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system,
          'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      main {
        width: 100%;
        max-width: 520px;
        background: var(--surface);
        border: 1px solid var(--stroke);
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.08);
      }
      h1 {
        margin: 0 0 6px;
        font-size: 24px;
        font-weight: 600;
      }
      p {
        margin: 0 0 20px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.6;
      }
      a {
        color: var(--brand);
        text-decoration: none;
        font-weight: 600;
      }
      a:hover {
        color: var(--brand-hover);
        text-decoration: underline;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>404 — 页面不存在</h1>
      <p>
        你访问的页面不存在或已被移动。<br />
        The page you requested does not exist or has been moved.
      </p>
      <div class="actions">
        <a href="/en/">English 文档</a>
        <a href="/zh-CN/">简体中文文档</a>
        <a href="/languages">选择语言</a>
      </div>
    </main>
  </body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** 渲染语言选择页。 */
function renderLanguagePage(current: string): Response {
  const options = LOCALES.map((locale) => {
    const active = locale.code === current;
    return `
        <a class="option${active ? ' option--active' : ''}" href="${locale.prefix}">
          <span class="option__label">${locale.label}</span>
          <span class="option__hint">${locale.english}</span>
        </a>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NextMail 文档 — 选择语言 / Choose a language</title>
    <link rel="icon" href="/img/logo.png" />
    <style>
      :root {
        color-scheme: light dark;
        --surface: #ffffff;
        --surface-alt: #fafafa;
        --text: #242424;
        --text-secondary: #424242;
        --stroke: #d1d1d1;
        --stroke-subtle: #e0e0e0;
        --brand: #0f6cbd;
        --brand-hover: #115ea3;
        --on-brand: #ffffff;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --surface: #1b1a19;
          --surface-alt: #201f1e;
          --text: #f3f2f1;
          --text-secondary: #d2d0ce;
          --stroke: #484644;
          --stroke-subtle: #3b3a39;
          --brand: #2886de;
          --brand-hover: #479ef5;
          --on-brand: #000000;
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px 20px;
        background: var(--surface-alt);
        color: var(--text);
        font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system,
          'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      main {
        width: 100%;
        max-width: 520px;
        background: var(--surface);
        border: 1px solid var(--stroke-subtle);
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.08);
      }
      .logo {
        display: block;
        width: 44px;
        height: 44px;
        margin-bottom: 20px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
      p {
        margin: 0 0 24px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.6;
      }
      .options {
        display: grid;
        gap: 10px;
      }
      .option {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 14px 16px;
        border: 1px solid var(--stroke);
        border-radius: 6px;
        text-decoration: none;
        color: inherit;
        background: var(--surface);
        transition: background 150ms cubic-bezier(0.33, 0, 0.67, 1),
          border-color 150ms cubic-bezier(0.33, 0, 0.67, 1);
      }
      .option:hover {
        background: var(--surface-alt);
        border-color: var(--brand);
      }
      .option:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .option--active {
        border-color: var(--brand);
        box-shadow: inset 3px 0 0 var(--brand);
      }
      .option__label {
        font-size: 16px;
        font-weight: 600;
      }
      .option__hint {
        font-size: 12px;
        color: var(--text-secondary);
      }
      footer {
        margin-top: 24px;
        font-size: 12px;
        color: var(--text-secondary);
      }
      a {
        color: var(--brand);
      }
      footer a:hover {
        color: var(--brand-hover);
      }
    </style>
  </head>
  <body>
    <main>
      <img class="logo" src="/img/logo.svg" alt="NextMail" />
      <h1>NextMail 文档</h1>
      <p>选择你希望阅读的语言。 / Choose the language you would like to read in.</p>
      <div class="options">${options}
      </div>
      <footer>
        NextMail · <a href="https://github.com/SMYQH/nextmail">应用仓库</a> ·
        <a href="https://github.com/SMYQH/nextmail-docs">文档仓库</a>
      </footer>
    </main>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 语言选择页。
    if (url.pathname === '/languages') {
      return renderLanguagePage(detectLocale(request.headers.get('Accept-Language')));
    }

    // 站点根路径：跳转到对应语言。`?lang=` 允许用户显式覆盖自动检测。
    if (url.pathname === '/' || url.pathname === '') {
      const override = url.searchParams.get('lang');
      const code = override && findLocale(override).code === override ? override : detectLocale(request.headers.get('Accept-Language'));
      return redirectTo(findLocale(code).prefix);
    }

    // 其余路径交给静态资源（包含各语言的 404.html 处理）。
    const response = await env.ASSETS.fetch(request);

    // 站点根路径下没有语言前缀时不存在于语言目录中，因此静态资源找不到对应的
    // 404.html。这里补一个带语言选择的友好页面。
    if (response.status === 404 && !url.pathname.startsWith('/en/') && !url.pathname.startsWith('/zh-CN/')) {
      return renderNotFoundPage();
    }

    return response;
  },
};
