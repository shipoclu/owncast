// SignInButton.tsx
//
import { useAccount, useSignMessage, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';
import { Web3AuthModalProps } from '../../modals/Web3AuthModal/Web3AuthModal';

const ConnectButton = ({ onclick, disabled }: { onclick: () => void; disabled: boolean }) => (
  <button
    type="button"
    onClick={onclick}
    disabled={disabled}
    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
  >
    Connnect Wallet
  </button>
);

const SignInButton = ({ onclick, disabled }: { onclick: () => void; disabled: boolean }) => (
  <button
    type="button"
    onClick={onclick}
    disabled={disabled}
    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
  >
    {disabled ? 'Authenticating...' : 'Login'}
  </button>
);

export const Web3SignInButton = ({
  authenticated,
  displayName,
  accessToken,
}: Web3AuthModalProps) => {
  const { connect, isSuccess } = useConnect();
  const account = useAccount({ enabled: isSuccess } as any);
  const { address, isConnected } = account;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();

  const makeRequest = async (url: string, data: Record<string, any>) => {
    const rawResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const content = await rawResponse.json();
    if (content?.message) {
      setError(content.message);
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!isConnected) {
      connect({ connector: injected() });
    }
  };

  const handleSignIn = async () => {
    console.log('Clicked handleSignIn');
    try {
      setIsLoading(true);
      setError(null);

      if (!address) {
        setError('No address!');
        return;
      }

      const timestamp = new Date().toISOString();
      const { hostname } = window.location;
      const message = `${address} wants to connect to: ${hostname} at: ${timestamp}`;

      const signature = await signMessageAsync({ message } as any);

      const data = { signature, address, timestamp, hostname, message, displayName };

      await makeRequest(`/api/auth/web3/verify?accessToken=${accessToken}`, data);

      if (!error) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isConnected ? null : <ConnectButton onclick={handleConnect} disabled={isConnected} />}

      {isConnected && !authenticated ? (
        <SignInButton onclick={handleSignIn} disabled={isLoading} />
      ) : null}

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};
