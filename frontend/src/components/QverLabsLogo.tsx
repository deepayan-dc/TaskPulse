export const QVERLABS_LOGO_URL = 'https://qverlabs.com/assets/navbar-logo.png';

/** Official QverLabs logo (provider branding). */
const QverLabsLogo = ({ className = '', height = 22 }: { className?: string; height?: number }) => (
  <img
    src={QVERLABS_LOGO_URL}
    alt="QverLabs"
    style={{ height, width: 'auto' }}
    className={className}
  />
);

export default QverLabsLogo;
