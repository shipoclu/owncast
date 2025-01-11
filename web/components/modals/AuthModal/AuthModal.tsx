import { Tabs } from 'antd';
import { useRecoilValue } from 'recoil';
import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { IndieAuthModal } from '../IndieAuthModal/IndieAuthModal';
import { FediAuthModal } from '../FediAuthModal/FediAuthModal';
import { Web3AuthModal } from '../Web3AuthModal/Web3AuthModal';

import styles from './AuthModal.module.scss';
import {
  currentUserAtom,
  chatAuthenticatedAtom,
  accessTokenAtom,
  clientConfigStateAtom,
} from '../../stores/ClientConfigStore';
import { ClientConfig } from '../../../interfaces/client-config.model';
import { ComponentError } from '../../ui/ComponentError/ComponentError';

export type AuthModalProps = {
  forceTabs?: boolean;
};

export const AuthModal: FC<AuthModalProps> = ({ forceTabs }) => {
  const authenticated = useRecoilValue<boolean>(chatAuthenticatedAtom);
  const accessToken = useRecoilValue<string>(accessTokenAtom);
  const currentUser = useRecoilValue(currentUserAtom);
  const clientConfig = useRecoilValue<ClientConfig>(clientConfigStateAtom);

  if (!currentUser) {
    return null;
  }
  const { displayName } = currentUser;
  const { federation } = clientConfig;
  const { enabled: fediverseEnabled } = federation;

  const web3AuthTabTitle = (
    <span className={styles.tabContent}>
      Web3 Auth
    </span>
  );

  const web3AuthTab = (
    <Web3AuthModal
      authenticated={authenticated}
      displayName={displayName}
      accessToken={accessToken}
    />
  );

  const indieAuthTabTitle = (
    <span className={styles.tabContent}>
      <img className={styles.icon} src="/img/indieauth.png" alt="IndieAuth" />
      IndieAuth
    </span>
  );

  const indieAuthTab = (
    <IndieAuthModal
      authenticated={authenticated}
      displayName={displayName}
      accessToken={accessToken}
    />
  );

  const fediAuthTabTitle = (
    <span className={styles.tabContent}>
      <img className={styles.icon} src="/img/fediverse-black.png" alt="Fediverse auth" />
      FediAuth
    </span>
  );

  const fediAuthTab = (
    <FediAuthModal
      authenticated={authenticated}
      displayName={displayName}
      accessToken={accessToken}
    />
  );

  const items = [
    { label: web3AuthTabTitle, key: '1', children: web3AuthTab },
    { label: indieAuthTabTitle, key: '2', children: indieAuthTab },
    { label: fediAuthTabTitle, key: '3', children: fediAuthTab },
  ];

  return (
    <ErrorBoundary
      // eslint-disable-next-line react/no-unstable-nested-components
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ComponentError
          componentName="AuthModal"
          message={error.message}
          retryFunction={resetErrorBoundary}
        />
      )}
    >
      <div>
        <Tabs
          defaultActiveKey="1"
          items={items}
          type="card"
          size="small"
          renderTabBar={fediverseEnabled || forceTabs ? null : () => null}
        />
      </div>
    </ErrorBoundary>
  );
};
