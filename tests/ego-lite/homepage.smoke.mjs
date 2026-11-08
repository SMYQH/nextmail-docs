const baseUrl = 'http://127.0.0.1:3004';
const currentYear = String(new Date().getFullYear());

const locales = [
  {
    path: '/en/',
    lang: 'en',
    hero: 'Temporary email you host yourself',
    primaryCta: 'Deploy NextMail',
    secondaryCta: 'OpenAPI reference',
    previewAlt: 'NextMail mailbox interface',
    pathHeading: 'Pick your path',
  },
  {
    path: '/zh-CN/',
    lang: 'zh-CN',
    hero: '自己托管的临时邮箱服务',
    primaryCta: '开始部署',
    secondaryCta: '查看 OpenAPI',
    previewAlt: 'NextMail 收件箱界面',
    pathHeading: '选择你的阅读路径',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findText(snapshot, text) {
  return snapshot.includes(text);
}

const taskName = `nextmail-docs-ego-lite-${Date.now()}`;
const task = await taskSpace(taskName);

try {
  const page = task.page('p1');
  console.log({ taskSpaceId: task.spaceId, page: page.label, baseUrl });

  for (const locale of locales) {
    await page.goto(`${baseUrl}${locale.path}`);
    await page.waitForLoadState();
    const snapshot = await page.snapshot({ scope: 'full_page' });
    const language = await page.evaluate(() => document.documentElement.lang);

    assert(language === locale.lang, `${locale.path}: html lang is ${language}`);
    assert(findText(snapshot, locale.hero), `${locale.path}: hero heading is missing`);
    assert(findText(snapshot, locale.primaryCta), `${locale.path}: primary CTA is missing`);
    assert(findText(snapshot, locale.secondaryCta), `${locale.path}: OpenAPI CTA is missing`);
    assert(findText(snapshot, locale.pathHeading), `${locale.path}: reading paths heading is missing`);

    const preview = await page.evaluate((alt) => {
      const image = [...document.images].find((candidate) => candidate.alt === alt);
      return image
        ? { complete: image.complete, naturalWidth: image.naturalWidth, src: image.currentSrc }
        : null;
    }, locale.previewAlt);
    assert(preview?.complete && preview.naturalWidth > 0, `${locale.path}: preview image is missing or not loaded`);

    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a')].map((link) => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
      })),
    );
    const primary = links.find((link) => link.text === locale.primaryCta);
    const secondary = links.find((link) => link.text === locale.secondaryCta);
    assert(primary?.href?.endsWith('/getting-started/quick-deploy'), `${locale.path}: primary CTA target is wrong`);
    assert(secondary?.href?.endsWith('/developers/openapi'), `${locale.path}: OpenAPI CTA target is wrong`);
  }

  await page.fill('loc=css:input[placeholder="搜索"]', 'webhook');
  await page.waitForSelector('loc=css:[role="listbox"]', { state: 'visible', timeout: 10000 });
  const chineseSeeAll = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/search/"]')]
      .find((link) => link.getAttribute('href')?.includes('?q='))
      ?.textContent?.trim() || '',
  );
  assert(chineseSeeAll.includes('查看全部结果'), 'Chinese search action is not translated');
  assert(!chineseSeeAll.includes('{count}'), 'Chinese search action has an unresolved count placeholder');

  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.goto(`${baseUrl}/zh-CN/getting-started/overview`);
  await page.waitForLoadState();
  const chineseDocsSnapshot = await page.snapshot({ scope: 'full_page' });
  assert(findText(chineseDocsSnapshot, '快速上手'), 'Chinese sidebar is not translated');
  assert(findText(chineseDocsSnapshot, '开发者与 AI 代理'), 'Chinese developer sidebar is not translated');
  assert(
    findText(chineseDocsSnapshot, `Copyright © ${currentYear} SMYQH。基于 AGPL-3.0 授权。`),
    'Chinese copyright text is incorrect',
  );
  assert(!chineseDocsSnapshot.includes('{year}'), 'Chinese copyright contains an unresolved year placeholder');
  assert(!chineseDocsSnapshot.includes('{count}'), 'Chinese search translation contains an unresolved count placeholder');

  await page.goto(`${baseUrl}/en/`);
  await page.waitForLoadState();
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const search = 'loc=css:input[placeholder="Search"]';
  await page.fill(search, 'webhook');
  await page.waitForSelector('loc=css:[role="listbox"]', { state: 'visible', timeout: 10000 });
  const suggestionText = await page.evaluate(() => document.querySelector('[role="listbox"]')?.textContent || '');
  assert(suggestionText.includes('Webhooks'), 'search suggestions do not contain Webhooks');

  const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme-choice'));
  await page.click('loc=role:button[name*="Switch between dark and light mode"]', { label: 'toggle theme mode' });
  const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme-choice'));
  assert(themeBefore !== themeAfter, 'theme toggle did not change the active theme');

  await page.goto(`${baseUrl}/en/getting-started/quick-deploy`);
  await page.waitForLoadState();
  const deploySnapshot = await page.snapshot({ scope: 'full_page' });
  assert(findText(deploySnapshot, 'Verify the deployment'), 'quick deploy verification section is missing');
  assert(findText(deploySnapshot, '/api/config'), 'quick deploy verification endpoint is missing');

  await page.goto(`${baseUrl}/en/`);
  await page.waitForLoadState();
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    nextSectionVisible: (document.querySelector('.fluent-section')?.getBoundingClientRect().top ?? Infinity) < window.innerHeight,
  }));
  assert(metrics.scrollWidth <= metrics.clientWidth + 1, `horizontal overflow detected: ${JSON.stringify(metrics)}`);
  assert(metrics.viewportWidth === 390, `mobile viewport was not applied: ${JSON.stringify(metrics)}`);
  assert(metrics.nextSectionVisible, `next section is not visible on mobile: ${JSON.stringify(metrics)}`);

  console.log({
    passed: true,
    checks: ['localized homepages', 'CTA destinations', 'search', 'theme toggle', 'deploy verification docs', 'mobile first-screen and overflow'],
  });
} finally {
  await task.finish({ keep: [] });
}
