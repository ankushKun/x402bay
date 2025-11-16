import { useRouter } from 'next/router';
import { FileItem } from '@/lib/models';

export default function ListingPreview({ listing }: { listing: FileItem }) {
    const router = useRouter();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Strip markdown formatting and return plain text
    const stripMarkdown = (markdown: string): string => {
        return markdown
            // Remove headers
            .replace(/#{1,6}\s+/g, '')
            // Remove bold/italic
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            // Remove images
            .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Remove blockquotes
            .replace(/^\s*>\s+/gm, '')
            // Remove horizontal rules
            .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
            // Remove list markers
            .replace(/^\s*[-*+]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            // Clean up extra whitespace
            .replace(/\n{2,}/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const getDescriptionPreview = (description: string): { text: string; isTruncated: boolean } => {
        const plainText = stripMarkdown(description);
        const maxLength = 150; // Approximate character limit for 2 lines

        if (plainText.length <= maxLength) {
            return { text: plainText, isTruncated: false };
        }

        // Truncate at word boundary
        const truncated = plainText.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;

        return { text: finalText, isTruncated: true };
    };

    const { text: descriptionText, isTruncated } = getDescriptionPreview(listing.description);

    return (
        <div
            className="bg-white/5 border border-white/10 mb-3 cursor-pointer hover:border-white/30 transition-colors"
        >
            {/* Header bar - black and white */}
            <div className="border-b border-white/10 bg-black/80 px-4 py-2">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-white/95">ITEM #{listing.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-xs text-white/50">{formatDate(listing.uploadedAt)}</span>
                </div>
            </div>

            {/* Main content area */}
            <div className="p-4">
                <div className="flex gap-4">
                    {/* Left side - thumbnail image */}
                    <div className="shrink-0">
                        {listing.itemImages && listing.itemImages.length > 0 ? (
                            <img
                                src={`/api/images/${listing.itemImages[0].filename}`}
                                alt={listing.name || listing.title || 'Item thumbnail'}
                                className="w-32 h-32 border border-white/10 bg-black/30 object-cover"
                            />
                        ) : (
                            <div className="w-32 h-32 border border-white/10 bg-black/30 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl mb-1">📁</div>
                                    <div className="text-[10px] text-white/50 font-mono">{formatFileSize(listing.size)}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right side - listing details */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg mb-2 hover:text-white/80 transition-colors">
                            {listing.name || listing.title}
                        </h3>
                        <p className="text-white/60 text-sm mb-3 line-clamp-2">
                            {descriptionText}
                            {isTruncated && <>... <span className="text-white hover:underline">read more</span></>}
                        </p>

                        {/* Price and action area */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-baseline gap-2 ml-auto">
                                <span className="text-white/50 text-xs font-medium">
                                    {typeof listing.token === 'object' ? listing.token.symbol : 'USDC'}
                                </span>
                                <span className="text-green-400 text-3xl font-semibold">${listing.price}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-black/30 border-t border-white/10 px-4 py-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Digital Download</span>
                        <span>•</span>
                        <span>Instant Delivery</span>
                    </div>
                    <span className="text-xs text-white/60 hover:text-white/90 font-medium cursor-pointer">
                        View Details →
                    </span>
                </div>
            </div>
        </div>
    );
}