// SignInButton.tsx
//
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { useAccount, useSignMessage, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';
import { Web3AuthModalProps } from '../../modals/Web3AuthModal/Web3AuthModal';
import { config } from '../../layouts/Main/Main';

// @ts-ignore
export const Web3SignInButton = ({
  authenticated,
  displayName,
  accessToken,
}: Web3AuthModalProps) => {
  const { connect, isSuccess } = useConnect()
  const account = useAccount({ enabled: isSuccess });
  const { address, isConnected } = account;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();

  const handleSignIn = async () => {
    console.log("Clicked handleSignIn");
    try {
      setIsLoading(true);
      setError(null);

      // Connect wallet if not connected
      if (!isConnected) {
        console.log("Wallet not connected so connecting.");
        await connect({ connector: injected() });
      }

      if (!address) {
        console.error("No address!");
        return;
      }

      // Create message with timestamp
      console.log("Creating message and signature.");
      const timestamp = new Date().toISOString();
      // TODO: get this dynamically.
      const site = 'https://stream.shipoclu.com';
      const message = `${address} wants to connect to: ${site} at: ${timestamp}`;

      const signature = await signMessageAsync({ message } as any);

      const body = JSON.stringify({ signature, address, timestamp, site, message, displayName });
      console.log('body:', body);

      const response = await fetch('/api/web3/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.status !== 200) {
        throw new Error('Verification failed');
      }

      // Handle successful verification
      console.log('Successfully verified!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};
