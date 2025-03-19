import { Space, Collapse } from 'antd';
import React, { FC } from 'react';
import { Web3SignInButton } from '../../ui/Web3SignInButton/Web3SignInButton';

const { Panel } = Collapse;

export type Web3AuthModalProps = {
  authenticated: boolean;
  displayName: string;
  accessToken: string;
};

export const Web3AuthModal: FC<Web3AuthModalProps> = ({
  authenticated,
  displayName: username,
  accessToken,
}) => {
  const message = !authenticated ? (
    <span>
      Use your Ethereum wallet to authenticate <span>{username}</span> or login as a previously{' '}
      authenticated chat user using your wallet.
    </span>
  ) : (
    <span>
      <b>You are already authenticated</b>. However, you can log in as a different user.
    </span>
  );

  return (
    <Space direction="vertical">
      {message}
      <div>Connect wallet</div>
      <Web3SignInButton
        authenticated={authenticated}
        displayName={username}
        accessToken={accessToken}
      />

      <Collapse ghost>
        <Panel key="header" header="Learn more about using Wagmi to authenticate with chat.">
          <p>Wagmi lets you authenticate using your Web3 wallet provider.</p>
        </Panel>
      </Collapse>
      <div>
        <strong>Note</strong>: This is for authentication purposes only, and no personal information
        will be accessed or stored and your wallet contents will not be touched.
      </div>
    </Space>
  );
};
