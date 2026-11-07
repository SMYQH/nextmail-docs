import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Two reading paths:
 * - `gettingStarted` / `guides` are written for newcomers.
 * - `developers` is written for professional users and AI agents.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsible: false,
      className: 'sidebar-section-start',
      items: [
        'getting-started/overview',
        'getting-started/quick-deploy',
        'getting-started/email-domain',
        'getting-started/mailbox',
        'getting-started/roles',
        'getting-started/settings',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsible: false,
      className: 'sidebar-section-guide',
      items: ['guides/webhooks', 'guides/faq'],
    },
    {
      type: 'category',
      label: 'Developers & AI Agents',
      collapsible: false,
      className: 'sidebar-section-dev',
      items: [
        'developers/architecture',
        'developers/openapi',
        'developers/agent-integration',
        'developers/local-development',
        'developers/deployment',
        'developers/regression-checklist',
      ],
    },
  ],
};

export default sidebars;