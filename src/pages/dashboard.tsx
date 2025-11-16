import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Layout from '@/components/layout';
import ListingPreview from '@/components/listing-preview';
import { FileItem } from '@/lib/models';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';

type TabType = 'purchases' | 'likes' | 'uploads';

interface PurchasedItem extends FileItem {
    purchaseInfo?: {
        purchasedAt: string;
        transactionHash?: string;
        amount: string;
    };
}

export default function Dashboard() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<TabType>('purchases');
    const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
    const [likes, setLikes] = useState<FileItem[]>([]);
    const [uploads, setUploads] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (isConnected && address) {
            // Load all data when dashboard opens
            loadAllData();
        }
    }, [isConnected, address]);

    useEffect(() => {
        if (isConnected && address && initialLoadDone) {
            // Silently reload data when tab changes (after initial load)
            loadAllData(true);
        }
    }, [activeTab]);

    const loadAllData = async (silent = false) => {
        if (loading) return; // Prevent duplicate requests

        if (!silent) {
            setLoading(true);
        }
        setError('');

        try {
            // Fetch all three endpoints in parallel
            const [purchasesRes, likesRes, uploadsRes] = await Promise.all([
                fetch('/api/user/purchases'),
                fetch('/api/user/likes'),
                fetch('/api/user/uploads'),
            ]);

            if (!purchasesRes.ok || !likesRes.ok || !uploadsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const [purchasesData, likesData, uploadsData] = await Promise.all([
                purchasesRes.json(),
                likesRes.json(),
                uploadsRes.json(),
            ]);

            setPurchases(purchasesData.items);
            setLikes(likesData.items);
            setUploads(uploadsData.items);
            setInitialLoadDone(true);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            if (!silent) {
                setError('Failed to load dashboard data. Please try again.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    if (!isConnected) {
        return (
            <Layout>
                <div className="w-full mt-5 max-w-4xl mx-auto">
                    <div className="bg-white/5 border border-white/10 p-16 text-center">
                        <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
                        <p className="text-white/60 mb-6">
                            Connect your wallet to view your purchases, likes, and uploads
                        </p>
                        <div className="flex justify-center">
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const renderContent = (tab: TabType, items: FileItem[] | PurchasedItem[]) => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-16">
                    <Spinner className="w-8 h-8" />
                    <span className="ml-3 text-white/70">Loading dashboard...</span>
                </div>
            );
        }

        if (items.length === 0) {
            const emptyMessages = {
                purchases: "You haven't purchased any items yet",
                likes: "You haven't liked any items yet",
                uploads: "You haven't uploaded any items yet",
            };

            return (
                <div className="bg-white/5 border border-white/10 p-12 text-center">
                    <p className="text-white/90 text-base mb-4 font-semibold">
                        {emptyMessages[tab]}
                    </p>
                    <p className="text-white/50 text-sm mb-6">
                        {tab === 'uploads'
                            ? 'Start selling your digital products on the marketplace'
                            : 'Explore the marketplace to find great items'}
                    </p>
                    <Link
                        href={tab === 'uploads' ? '/upload' : '/'}
                        className="inline-block bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-6 transition-colors"
                    >
                        {tab === 'uploads' ? 'Upload Item' : 'Browse Marketplace'}
                    </Link>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="relative">
                        <ListingPreview listing={item} showEdit={tab === "uploads"} />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Layout>
            <div className="w-full mt-5 max-w-6xl mx-auto px-4">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-white/60 text-sm font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4">
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
                    <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
                        <TabsTrigger
                            value="purchases"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                        >
                            Purchases
                            {purchases.length > 0 && !loading && (
                                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                    {purchases.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="likes"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                        >
                            Likes
                            {likes.length > 0 && !loading && (
                                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                    {likes.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="uploads"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                        >
                            My Uploads
                            {uploads.length > 0 && !loading && (
                                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                    {uploads.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="purchases">
                        {renderContent('purchases', purchases)}
                    </TabsContent>

                    <TabsContent value="likes">
                        {renderContent('likes', likes)}
                    </TabsContent>

                    <TabsContent value="uploads">
                        {renderContent('uploads', uploads)}
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
