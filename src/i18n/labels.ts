/**
 * Component-level copy for the landing page.
 *
 * Page content lives in `docs/` (English) and `i18n/<locale>/`
 * (translations). Only strings that are rendered by React components are
 * kept here, so translators never have to touch TypeScript.
 */
export interface HomeLabels {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  pathsTitle: string;
  pathsLead: string;
  newcomerBadge: string;
  newcomerTitle: string;
  newcomerDescription: string;
  newcomerLinks: { label: string; to: string }[];
  expertBadge: string;
  expertTitle: string;
  expertDescription: string;
  expertLinks: { label: string; to: string }[];
  featuresTitle: string;
  featuresLead: string;
  features: { title: string; description: string }[];
  previewAlt: string;
}

export const homeLabels: Record<string, HomeLabels> = {
  en: {
    heroEyebrow: 'NextMail documentation',
    heroTitle: 'Temporary email you host yourself',
    heroSubtitle:
      'NextMail runs entirely on Cloudflare Workers, D1 and Email Routing. Deploy it in minutes, then read it, manage it or automate it through the OpenAPI.',
    heroPrimaryCta: 'Deploy NextMail',
    heroSecondaryCta: 'OpenAPI reference',
    pathsTitle: 'Pick your path',
    pathsLead:
      'Two reading paths for the same product: a guided start for newcomers, and the engineering details for developers and AI agents.',
    newcomerBadge: 'New here',
    newcomerTitle: 'I want to receive mail',
    newcomerDescription:
      'Deploy the service, point your domain at it, and start receiving mail. No code required.',
    newcomerLinks: [
      { label: 'Overview', to: '/getting-started/overview' },
      { label: 'Quick deploy', to: '/getting-started/quick-deploy' },
      { label: 'Email domain', to: '/getting-started/email-domain' },
      { label: 'Roles', to: '/getting-started/roles' },
    ],
    expertBadge: 'Professional',
    expertTitle: 'I build on top of NextMail',
    expertDescription:
      'Architecture, REST API, webhooks and the local development loop — the details an engineer or an agent needs.',
    expertLinks: [
      { label: 'Architecture', to: '/developers/architecture' },
      { label: 'OpenAPI', to: '/developers/openapi' },
      { label: 'Agent integration', to: '/developers/agent-integration' },
      { label: 'Local development', to: '/developers/local-development' },
      { label: 'Regression checklist', to: '/developers/regression-checklist' },
    ],
    featuresTitle: 'What you get',
    featuresLead: 'The pieces that make NextMail practical to self-host.',
    features: [
      {
        title: 'One-command Cloudflare deploy',
        description:
          'A single script provisions D1, KV and the Workers, applies migrations and installs secrets.',
      },
      {
        title: 'Multi-domain mailboxes',
        description:
          'Serve several domains at once, with per-domain catch-all routing and visibility rules.',
      },
      {
        title: 'Role-based access',
        description:
          'Emperor, duke, knight and civilian roles keep administration separate from everyday use.',
      },
      {
        title: 'OpenAPI and webhooks',
        description:
          'API keys for automation, signed webhook deliveries for every new message.',
      },
      {
        title: 'Sending and sharing',
        description:
          'Send through Resend, share single messages or whole mailboxes with expiring links.',
      },
      {
        title: 'Bilingual interface',
        description:
          'The app ships English and Simplified Chinese; this site does too.',
      },
    ],
    previewAlt: 'NextMail mailbox interface',
  },
  'zh-CN': {
    heroEyebrow: 'NextMail 文档',
    heroTitle: '自己托管的临时邮箱服务',
    heroSubtitle:
      'NextMail 完全运行在 Cloudflare Workers、D1 与邮件路由之上。几分钟完成部署，之后既可以手动收发，也可以通过 OpenAPI 自动化。',
    heroPrimaryCta: '开始部署',
    heroSecondaryCta: '查看 OpenAPI',
    pathsTitle: '选择你的阅读路径',
    pathsLead:
      '同一个产品的两条路径：面向新手的上手指南，以及面向工程师和 AI 代理的技术细节。',
    newcomerBadge: '新手',
    newcomerTitle: '我只想收邮件',
    newcomerDescription:
      '部署服务、把域名指向它，然后开始收信。全程无需写代码。',
    newcomerLinks: [
      { label: '项目概览', to: '/getting-started/overview' },
      { label: '快速部署', to: '/getting-started/quick-deploy' },
      { label: '邮箱域名配置', to: '/getting-started/email-domain' },
      { label: '权限角色', to: '/getting-started/roles' },
    ],
    expertBadge: '专业用户',
    expertTitle: '我要在 NextMail 之上开发',
    expertDescription:
      '架构、REST API、Webhook 与本地开发流程——工程师和 AI 代理真正需要的细节。',
    expertLinks: [
      { label: '系统架构', to: '/developers/architecture' },
      { label: 'OpenAPI', to: '/developers/openapi' },
      { label: 'AI 代理接入', to: '/developers/agent-integration' },
      { label: '本地开发', to: '/developers/local-development' },
      { label: '回归检查', to: '/developers/regression-checklist' },
    ],
    featuresTitle: '核心能力',
    featuresLead: '让 NextMail 真正适合自托管的部分。',
    features: [
      {
        title: '一条命令完成 Cloudflare 部署',
        description:
          '单个脚本自动创建 D1、KV 与 Workers、执行迁移并安装 Secrets。',
      },
      {
        title: '多域名邮箱',
        description:
          '同时服务多个域名，按域名配置 Catch-all 收件与可见性规则。',
      },
      {
        title: '基于角色的权限',
        description:
          '皇帝、公爵、骑士、平民四种角色，把管理与日常使用分开。',
      },
      {
        title: 'OpenAPI 与 Webhook',
        description:
          '用 API Key 做自动化，每封新邮件都会触发带签名的 Webhook 通知。',
      },
      {
        title: '发件与分享',
        description:
          '通过 Resend 发信，可分享单封邮件或整个收件箱，并设置过期时间。',
      },
      {
        title: '双语界面',
        description: '应用与本站均提供英文与简体中文。',
      },
    ],
    previewAlt: 'NextMail 收件箱界面',
  },
};