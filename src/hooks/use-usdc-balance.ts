import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getBalance } from '@/lib/utils';
import { Chain } from 'viem';
import type { Address } from 'viem';
import CONSTANTS from '@/lib/constants';
const { TOKENS } = CONSTANTS;

export function useUSDCBalance({ targetAddress, chain }: { targetAddress?: string, chain?: Chain } = {}) {
  const { address: connectedAddress } = useAccount();
  const address = targetAddress || connectedAddress;
  const chainId = useChainId();
  const [balance, setBalance] = useState<string>('NA');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchBalance() {
      if (!address || !chain) {
        setBalance('0');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const usdcToken = TOKENS[chain.id].USDC;
        if (!usdcToken) {
          throw new Error(`USDC address not found for chain ID ${chain.id}`);
        }
        const fetchedBalance = await getBalance(address, usdcToken.address, chain);
        setBalance(fetchedBalance);
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        setBalance('0');
      } finally {
        setIsLoading(false);
      }
    }

    // Fetch balance immediately
    fetchBalance();

    // Set up interval to fetch balance every 5 seconds
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 5000);

    // Clean up interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [address, chainId, chain]);

  return { balance, isLoading };
}
