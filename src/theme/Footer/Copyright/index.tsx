import type {ReactNode} from 'react';
import type {Props} from '@theme/Footer/Copyright';

export default function FooterCopyright({copyright}: Props): ReactNode {
  const year = String(new Date().getFullYear());
  const localizedCopyright = copyright.replace(/\{year\}|\b(?:19|20)\d{2}\b/, year);

  return (
    <div
      className="footer__copyright"
      // The footer value comes from the trusted site configuration and translations.
      dangerouslySetInnerHTML={{__html: localizedCopyright}}
    />
  );
}
