import { Chain } from "@rainbow-me/rainbowkit";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createPublicClient, http, formatUnits, erc20Abi, type Address } from 'viem';
import { base, baseSepolia, mainnet, polygon, optimism, arbitrum } from 'viem/chains';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export async function getBalance(address: string, tokenAddress: string, chain: Chain): Promise<string> {
    // Validate inputs
    if (!address || !tokenAddress || !chain) {
        throw new Error('Address, token address, and chain are required');
    }

    // Create a public client for the specified chain
    const publicClient = createPublicClient({
        chain,
        transport: http(),
    });

    try {
        // Read the balance using the ERC-20 balanceOf function
        const balance = await publicClient.readContract({
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as Address],
        });

        // Get token decimals to format the balance properly
        const decimals = await publicClient.readContract({
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'decimals',
        });

        // Format the balance from wei to human-readable format
        const formattedBalance = formatUnits(balance, decimals);

        return formattedBalance;
    } catch (error) {
        console.error('Error fetching balance:', error);
        throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}