import { useUSDCBalance } from "@/lib/use-usdc-balance";
import { baseSepolia } from "viem/chains";
import { useAccount } from 'wagmi';

import CustomConnectButton from "./connect-button";
import { Button } from "./ui/button";
import Link from "next/link";
import { useState } from "react";

export default function Menubar() {
    //connected bool
    const { isConnected } = useAccount();
    const [balanceHidden, setBalanceHidden] = useState(false);

    const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance({ chain: baseSepolia });


    return <div className="flex border-b pb-2 border-white/10">
        <div className="flex items-center justify-center font-semibold px-2 text-4xl">
            <Link href="/" className="text-white/95">
                <span className="text-red-500">x</span>
                <span className="text-yellow-500">402</span>
                <span className="text-blue-600">bay</span>
            </Link>
        </div>
        <div className="grow" id="divider" />
        {isConnected && <>
            <div onClick={() => setBalanceHidden(!balanceHidden)}
                className="cursor-pointer h-10 flex items-center justify-center px-2 rounded-none font-mono text-sm">${balanceHidden ? "XX.XX" : usdcBalance}</div>
            <Link href="/dashboard">
                <Button variant="link" className="h-10 pl-1 flex items-center justify-center rounded-none">DASHBOARD</Button>
            </Link>
        </>
        }
        <CustomConnectButton className="border border-background/10 h-10" />
    </div >
}