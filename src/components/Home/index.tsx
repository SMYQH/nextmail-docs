import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {
  ArrowRightRegular,
  BotRegular,
  CloudRegular,
  KeyRegular,
  MailRegular,
  PeopleRegular,
  RocketRegular,
  ServerRegular,
  ShareRegular,
} from '@fluentui/react-icons';

import { homeLabels } from '@site/src/i18n/labels';

const FEATURE_ICONS = [CloudRegular, MailRegular, PeopleRegular, KeyRegular, ShareRegular, ServerRegular];

function useLabels() {
  const { i18n } = useDocusaurusContext();
  return homeLabels[i18n.currentLocale] ?? homeLabels.en;
}

export function HomeHero(): React.JSX.Element {
  const labels = useLabels();
  const previewSrc = useBaseUrl('/img/preview.png');

  return (
    <header className="fluent-hero">
      <div className="container fluent-hero__layout">
        <div className="fluent-hero__copy">
          <p className="fluent-hero__eyebrow">{labels.heroEyebrow}</p>
          <h1 className="fluent-hero__title">{labels.heroTitle}</h1>
          <p className="fluent-hero__subtitle">{labels.heroSubtitle}</p>
          <div className="fluent-hero__actions">
            <Link className="button button--primary button--lg" to="/getting-started/quick-deploy">
              <RocketRegular style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {labels.heroPrimaryCta}
            </Link>
            <Link className="button button--outline button--lg" to="/developers/openapi">
              {labels.heroSecondaryCta}
              <ArrowRightRegular style={{ marginLeft: 8, verticalAlign: 'middle' }} />
            </Link>
          </div>
        </div>
        <figure className="fluent-hero__visual">
          <div className="fluent-hero__visual-frame">
            <img src={previewSrc} alt={labels.previewAlt} width={1440} height={900} />
          </div>
        </figure>
      </div>
    </header>
  );
}
export function HomePaths(): React.JSX.Element {
  const labels = useLabels();

  const paths = [
    {
      badge: labels.newcomerBadge,
      title: labels.newcomerTitle,
      description: labels.newcomerDescription,
      links: labels.newcomerLinks,
      icon: RocketRegular,
    },
    {
      badge: labels.expertBadge,
      title: labels.expertTitle,
      description: labels.expertDescription,
      links: labels.expertLinks,
      icon: BotRegular,
    },
  ];

  return (
    <section className="container fluent-section">
      <h2 className="fluent-section__title">{labels.pathsTitle}</h2>
      <p className="fluent-section__lead">{labels.pathsLead}</p>
      <div className="fluent-grid">
        {paths.map((path) => {
          const Icon = path.icon;
          return (
            <article className="fluent-path" key={path.badge}>
              <span className="fluent-path__badge">
                <Icon style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {path.badge}
              </span>
              <h3 className="fluent-path__title">{path.title}</h3>
              <p className="fluent-path__description">{path.description}</p>
              <ul className="fluent-path__links">
                {path.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
export function HomeFeatures(): React.JSX.Element {
  const labels = useLabels();

  return (
    <section className="container fluent-section">
      <h2 className="fluent-section__title">{labels.featuresTitle}</h2>
      <p className="fluent-section__lead">{labels.featuresLead}</p>
      <div className="fluent-grid">
        {labels.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
          return (
            <article className="fluent-path" key={feature.title}>
              <h3 className="fluent-path__title">
                <Icon style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {feature.title}
              </h3>
              <p className="fluent-path__description">{feature.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
