import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Layout from '@/components/layout';
import { FileItem } from '@/lib/models';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Chain } from 'viem';
import { wrapFetchWithPayment, createSigner, decodeXPaymentResponse } from "x402-fetch";

import CONSTANTS, { getCategoryLabel } from "@/lib/constants";
import { Button } from '@/components/ui/button';
const { CATEGORIES, CHAINS, CHAIN_LOGOS, TOKENS } = CONSTANTS;

const MDPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

interface ListingDetailsProps {
  item: FileItem | null;
}

export default function ListingDetails({ item }: ListingDetailsProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [linkAlertOpen, setLinkAlertOpen] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);

  if (!item) {
    return (
      <Layout>
        <div className="w-full mt-5">
          <div className="bg-white/5 border border-white/10 p-16 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Item Not Found</h1>
            <p className="text-white/60 mb-6">The listing you're looking for doesn't exist.</p>
            <button
              onClick={() => router.back()}
              className="bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-6 transition-colors"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleBuyNowClick = () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet to purchase and download this file');
      return;
    }

    if (!walletClient) {
      setError('Wallet client not initialized. Please reconnect your wallet.');
      return;
    }

    // Show confirmation dialog
    setPaymentConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    setPaymentConfirmOpen(false);
    setDownloading(true);
    setError('');
    setSuccess(false);
    setPaymentResponse(null);

    try {
      // Create a payment-enabled fetch function with the wallet client
      const paymentFetch = wrapFetchWithPayment(fetch, walletClient as any);

      // Use x402-fetch to make the request
      // It will automatically handle 402 responses and retry with payment
      const response = await paymentFetch(`/api/download/${item.id}`, {
        method: 'GET',
      });
      console.log('Download response:', response);

      // Extract payment response header if present
      const xPaymentResponse = response.headers.get('x-payment-response');
      console.log('X-Payment-Response header:', xPaymentResponse);
      if (xPaymentResponse) {
        const paymentInfo = decodeXPaymentResponse(xPaymentResponse);
        setPaymentResponse(paymentInfo);
        console.log('Payment completed:', paymentInfo);
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
    } catch (err: any) {
      console.error('Download error:', err);

      // Handle specific x402 errors
      if (err.message.includes('402') || err.message.includes('Payment')) {
        setError('Payment required but could not be processed. Please check your wallet balance and try again.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Download failed. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentConfirmOpen(false);
  };

  const hasImages = item.itemImages && item.itemImages.length > 0;

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) {
      // Calculate position for initial zoom
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
    }
    setIsZoomed(!isZoomed);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (isZoomed) {
      // Update zoom position while zoomed
      setZoomPosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        setPendingLink(href);
        setLinkAlertOpen(true);
      }
    }
  };

  const handleConfirmLink = () => {
    if (pendingLink) {
      window.open(pendingLink, '_blank', 'noopener,noreferrer');
    }
    setLinkAlertOpen(false);
    setPendingLink('');
  };

  const handleCancelLink = () => {
    setLinkAlertOpen(false);
    setPendingLink('');
  };

  return (
    <Layout>
      <div className="w-full mt-5 max-w-7xl mx-auto px-4">
        {/* Navigation */}
        <button
          onClick={() => router.push('/')}
          className="text-white/60 hover:text-white/90 font-medium transition-colors flex items-center gap-2 mb-6 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </button>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 p-4">
            <p className="text-green-200 text-sm font-medium mb-2">Purchase successful! Your download should start automatically.</p>
            {paymentResponse && (
              <div className="text-green-200/80 text-xs space-y-1">
                {paymentResponse.transactionHash && (
                  <p>Transaction: {paymentResponse.transactionHash.slice(0, 10)}...{paymentResponse.transactionHash.slice(-8)}</p>
                )}
                {paymentResponse.amount && (
                  <p>Amount: {paymentResponse.amount}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Images and Description */}
          <div className="space-y-6">
            {/* Image Gallery */}
            {hasImages ? (
              <div className="bg-white/5 border border-white/10 p-4">
                {/* Main Image with Zoom */}
                <div className="mb-4 bg-black/40 border border-white/10 overflow-hidden relative">
                  <div
                    className={`relative ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                    onClick={handleImageClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <img
                      src={`/api/images/${item.itemImages[selectedImageIndex].filename}`}
                      alt={item.itemImages[selectedImageIndex].originalName}
                      className={`w-full h-[500px] transition-transform duration-200 ${isZoomed ? 'scale-200' : 'scale-100'
                        }`}
                      style={
                        isZoomed
                          ? {
                            objectFit: 'contain',
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                          }
                          : { objectFit: 'contain' }
                      }
                    />
                  </div>
                </div>

                {/* Thumbnail Strip */}
                {item.itemImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {item.itemImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`shrink-0 w-20 h-20 border-2 ${selectedImageIndex === index
                          ? 'border-white/60'
                          : 'border-white/20 hover:border-white/40'
                          } transition-colors bg-black/40 overflow-hidden`}
                      >
                        <img
                          src={`/api/images/${image.filename}`}
                          alt={image.originalName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 p-8">
                <div className="bg-black/40 border border-white/10 h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-7xl mb-4">📁</div>
                    <p className="text-white/50 font-mono text-sm">{formatFileSize(item.size)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* About This Item */}
            <div className="bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4 pb-3 border-b border-white/10">
                About this item
              </h2>
              <div
                className="prose prose-invert max-w-none text-white/70"
                onClick={handleLinkClick}
              >
                <MDPreview
                  source={item.description}
                  style={{
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                  }}
                  wrapperElement={{
                    "data-color-mode": "dark"
                  }}
                  rehypeRewrite={(node: any) => {
                    if (node.type === 'element' && node.tagName === 'a') {
                      node.properties = {
                        ...node.properties,
                        rel: 'noopener noreferrer',
                      };
                    }
                  }}
                />
              </div>
            </div>

            {/* Item Specifics */}
            <div className="bg-white/5 border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4 pb-3 border-b border-white/10">
                Item specifics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">Filename:</span>
                  <span className="text-white/90 text-sm font-medium">{item.originalName}</span>
                </div>
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">File Size:</span>
                  <span className="text-white/90 text-sm font-medium">{formatFileSize(item.size)}</span>
                </div>
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">Category:</span>
                  <span className="text-white/90 text-sm font-medium">{getCategoryLabel(item.category)}</span>
                </div>
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">Payment Token:</span>
                  <span className="text-white/90 text-sm font-medium">
                    {typeof item.token === 'object' ? item.token.symbol : 'Unknown'}
                  </span>
                </div>
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">Protocol:</span>
                  <span className="text-white/90 text-sm font-medium">x402</span>
                </div>
                <div className="flex py-2 border-b border-white/5">
                  <span className="text-white/50 text-sm w-32">Listed:</span>
                  <span className="text-white/90 text-sm font-medium">{formatDate(item.uploadedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Purchase Panel */}
          <div className="lg:sticky lg:top-4 h-fit">
            {/* Price and Purchase */}
            <div className="bg-white/5 border border-white/10 p-6 mb-4">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white/50 text-sm">Price:</span>
                  <span className="text-4xl font-bold text-white">
                    ${item.price}
                  </span>
                  <span className="text-white/60 text-lg">
                    {typeof item.token === 'object' ? item.token.symbol : 'Unknown'}
                  </span>
                </div>
                {typeof item.token === 'object' && (
                  <p className="text-white/40 text-xs">{item.token.name}</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {!isConnected ? (
                  <div className="text-center py-4 flex flex-col items-center justify-center">
                    <p className="text-white/60 text-sm mb-4">Connect your wallet to purchase</p>
                    <ConnectButton />
                  </div>
                ) : (
                  <Button
                    onClick={handleBuyNowClick}
                    disabled={downloading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold p-6 transition-all text-lg"
                  >
                    {downloading ? 'Processing...' : 'Buy It Now'}
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-white text-sm font-medium">Instant Download</p>
                    <p className="text-white/50 text-xs">Access immediately after purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p className="text-white text-sm font-medium">Secure Payment</p>
                    <p className="text-white/50 text-xs">Protected by blockchain technology</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="text-white text-sm font-medium">Fast Transaction</p>
                    <p className="text-white/50 text-xs">Powered by x402 protocol</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Information */}
            <div className="bg-white/5 border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Seller information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-white/50 text-xs mb-1">Wallet Address</p>
                  <p className="text-white/90 text-xs font-mono break-all">
                    {item.uploaderAddress}
                  </p>
                </div>
                {typeof item.token === 'object' && (
                  <div>
                    <p className="text-white/50 text-xs mb-1">Token Contract</p>
                    <p className="text-white/70 text-xs font-mono break-all">
                      <Link target='_blank' href={`${(CHAINS[item.token.chainId] as Chain).blockExplorers?.default.url}/token/${item.token.contractAddress}`} className="underline hover:text-white/90 underline-offset-3">
                        {item.token.contractAddress}
                      </Link>
                    </p>
                  </div>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div>
                    <p className="text-white/50 text-xs mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-white/10 text-white/80 text-xs px-3 py-1 border border-white/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Alert Dialog */}
      <AlertDialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
        <AlertDialogContent className="bg-black/90 rounded-none backdrop-blur border border-white/20 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-2xl">Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Please review the payment details before proceeding:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            {/* Price Card - Prominent */}
            <div className="bg-linear-to-br from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm mb-1">Total Amount</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-bold text-4xl">{item.price}</span>
                    <span className="text-white/80 text-xl">
                      {typeof item.token === 'object' ? item.token.symbol : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Tag Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Blockchain Network */}
              <Link
                href={typeof item.token === 'object' && item.token.chainId ? (CHAINS[item.token.chainId] as Chain)?.blockExplorers?.default.url || '#' : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-500/20 p-2">
                    {typeof item.token === 'object' && item.token.chainId && CHAIN_LOGOS[item.token.chainId] ? (
                      <img src={CHAIN_LOGOS[item.token.chainId]} alt="Chain logo" className="w-5 h-5" />
                    ) : (
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/50 text-xs">Network</p>
                    <p className="text-white font-semibold text-sm truncate">
                      {typeof item.token === 'object' && item.token.chainId
                        ? (CHAINS[item.token.chainId] as Chain)?.name || 'Unknown'
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">ID:</span>
                  <span className="text-white/70 font-mono text-xs">
                    {typeof item.token === 'object' ? item.token.chainId : 'N/A'}
                  </span>
                </div>
              </Link>

              {/* Token Info */}
              <Link
                href={typeof item.token === 'object' && item.token.chainId && item.token.contractAddress ? `${(CHAINS[item.token.chainId] as Chain)?.blockExplorers?.default.url}/token/${item.token.contractAddress}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-500/20 p-2">
                    {typeof item.token === 'object' && item.token.symbol && TOKENS[item.token.chainId] && TOKENS[item.token.chainId][item.token.symbol].logo ? (
                      <img src={TOKENS[item.token.chainId][item.token.symbol].logo} alt="Token logo" className="w-5 h-5" />
                    ) : (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/50 text-xs">Token</p>
                    <p className="text-white font-semibold text-sm truncate">
                      {typeof item.token === 'object' ? item.token.name : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Symbol:</span>
                  <span className="text-white/70 font-mono text-xs">
                    {typeof item.token === 'object' ? item.token.symbol : 'N/A'}
                  </span>
                </div>
              </Link>
            </div>

            {/* Contract Address - Full Width */}
            <Link
              href={typeof item.token === 'object' && item.token.chainId && item.token.contractAddress ? `${(CHAINS[item.token.chainId] as Chain)?.blockExplorers?.default.url}/token/${item.token.contractAddress}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors block"
            >
              <div className="flex items-start gap-3">
                <div className="bg-yellow-500/20 p-2 mt-1">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-1">Token Contract Address</p>
                  <p className="text-white/90 font-mono text-xs break-all bg-black/30 p-2 hover:text-white transition-colors">
                    {typeof item.token === 'object' ? item.token.contractAddress : 'N/A'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Receiver Address - Full Width */}
            <Link
              href={typeof item.token === 'object' && item.token.chainId ? `${(CHAINS[item.token.chainId] as Chain)?.blockExplorers?.default.url}/address/${item.uploaderAddress}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors block"
            >
              <div className="flex items-start gap-3">
                <div className="bg-pink-500/20 p-2 mt-1">
                  <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-1">Payment Receiver (Seller)</p>
                  <p className="text-white/90 font-mono text-xs break-all bg-black/30 p-2 hover:text-white transition-colors">
                    {item.uploaderAddress}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelPayment}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPayment}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Confirmation Alert Dialog */}
      <AlertDialog open={linkAlertOpen} onOpenChange={setLinkAlertOpen}>
        <AlertDialogContent className="bg-black/90 border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">External Link Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              You are about to open an external link:
              <div className="mt-3 p-3 bg-white/10 border border-white/20 rounded">
                <p className="text-white/90 font-mono text-sm break-all">{pendingLink}</p>
              </div>
              <p className="mt-3">Do you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelLink}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLink}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Open Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    // Fetch item from API endpoint instead of directly from MongoDB
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/items/${id}`);

    if (!response.ok) {
      return {
        props: {
          item: null,
        },
      };
    }

    const { item } = await response.json();

    return {
      props: {
        item,
      },
    };
  } catch (error) {
    console.error('Error fetching item:', error);
    return {
      props: {
        item: null,
      },
    };
  }
};
