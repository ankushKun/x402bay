import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function CustomConnectButton({ className }: { className?: string }) {
    // const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance({ chain: baseSepolia });

    return <ConnectButton.Custom>
        {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
        }) => {
            // Note: If your app doesn't use authentication, you
            // can remove all 'authenticationStatus' checks
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

            return (
                <div
                    className={cn("flex", className)}
                    {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                        },
                    })}
                >
                    {(() => {
                        if (!connected) {
                            return (
                                <Button className="rounded-none border-0 shadow-none text-white/90 hover:text-white hover:bg-white/20" onClick={openConnectModal} type="button">
                                    Connect Wallet
                                </Button>
                            );
                        }

                        if (chain.unsupported) {
                            return (
                                <Button className="rounded-none border-0 shadow-none text-white/90 hover:text-white hover:bg-white/20" onClick={openChainModal} type="button">
                                    Wrong network
                                </Button>
                            );
                        }

                        return (
                            <Button className="rounded-none border-0 h-full shadow-none" onClick={openAccountModal} type="button">
                                {chain.hasIcon && (
                                    <div
                                        style={{
                                            background: chain.iconBackground,
                                            width: 12,
                                            height: 12,
                                            borderRadius: 999,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {chain.iconUrl && (
                                            <img
                                                alt={chain.name ?? 'Chain icon'}
                                                src={chain.iconUrl}
                                                style={{ width: 12, height: 12 }}
                                            />
                                        )}
                                    </div>
                                )}
                                {account.displayName}
                            </Button>
                        );
                    })()}
                </div>
            );
        }}
    </ConnectButton.Custom>
}