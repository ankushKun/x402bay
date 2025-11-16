import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '@/components/layout';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import CONSTANTS from "@/lib/constants";
import { FileItem } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const { CATEGORIES } = CONSTANTS;
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function EditItem() {
    const router = useRouter();
    const { id } = router.query;
    const { address, isConnected } = useAccount();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [price, setPrice] = useState('');
    const [itemImages, setItemImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [removedExistingImages, setRemovedExistingImages] = useState<string[]>([]);
    const [digitalFile, setDigitalFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isDraggingImages, setIsDraggingImages] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [downloadCount, setDownloadCount] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (id && isConnected) {
            loadItem();
        }
    }, [id, isConnected]);

    const loadItem = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/items/${id}/edit`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to load item');
            }

            const data = await response.json();
            const item: FileItem = data.item;

            setName(item.name || item.title || '');
            setDescription(item.description || '');
            setCategory(item.category.toString());
            setTags(item.tags || []);
            setPrice(item.price || '');
            setDownloadCount(item.downloadCount || 0);
            if (item.itemImages && item.itemImages.length > 0) {
                setExistingImages(item.itemImages.map(img => img.filename));
            }
        } catch (err) {
            console.error('Error loading item:', err);
            setError(err instanceof Error ? err.message : 'Failed to load item');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            addImages(files);
        }
    };

    const addImages = (files: File[]) => {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const remainingExistingCount = existingImages.length - removedExistingImages.length;
        const totalImages = remainingExistingCount + itemImages.length + imageFiles.length;

        if (totalImages > 5) {
            setError('Maximum 5 images allowed');
            return;
        }
        setItemImages([...itemImages, ...imageFiles]);
        setError('');
    };

    const handleImagesDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingImages(false);
        const files = Array.from(e.dataTransfer.files);
        addImages(files);
    };

    const handleImagesDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingImages(true);
    };

    const handleImagesDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingImages(false);
    };

    const removeImage = (index: number) => {
        setItemImages(itemImages.filter((_, i) => i !== index));
    };

    const removeExistingImage = (filename: string) => {
        setRemovedExistingImages([...removedExistingImages, filename]);
    };

    const handleDigitalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDigitalFile(e.target.files[0]);
        }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setDigitalFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(true);
    };

    const handleFileDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            setError('Please connect your wallet first');
            return;
        }

        if (!category) {
            setError('Please select a category');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('tags', JSON.stringify(tags));
            formData.append('price', price);

            // Append digital file if changed
            if (digitalFile) {
                formData.append('digitalFile', digitalFile);
            }

            // Append removed existing images
            if (removedExistingImages.length > 0) {
                formData.append('removedImages', JSON.stringify(removedExistingImages));
            }

            // Append new item images
            if (itemImages.length > 0) {
                itemImages.forEach((image, index) => {
                    formData.append(`itemImage${index}`, image);
                });
                formData.append('itemImagesCount', itemImages.length.toString());
            }

            const response = await fetch(`/api/items/${id}/edit`, {
                method: 'PUT',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update item');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/listing/${id}`);
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isConnected || !address) {
            setError('Please connect your wallet first');
            return;
        }

        setDeleting(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch(`/api/items/${id}/delete`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete/unlist item');
            }

            const data = await response.json();

            if (data.deleted) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else if (data.unlisted) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete/unlist item');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (!isConnected) {
        return (
            <Layout>
                <div className="w-full mt-5 max-w-3xl mx-auto">
                    <div className="bg-white/5 border border-white/10 p-16 text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">Wallet Connection Required</h3>
                        <p className="text-white/60 mb-6">Please connect your wallet to edit items</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <div className="w-full mt-5 max-w-3xl mx-auto">
                    <div className="flex justify-center items-center py-16">
                        <Spinner className="w-8 h-8" />
                        <span className="ml-3 text-white/70">Loading item...</span>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="w-full mt-5 max-w-3xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-white/60 hover:text-white/90 font-medium transition-colors flex items-center gap-2 mb-4 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-4xl font-bold text-white mb-2">Edit Item</h1>
                    <p className="text-lg text-white/60">Update your listing details</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4">
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-500/10 border border-green-500/30 p-4">
                        <p className="text-green-200 text-sm">Item updated successfully! Redirecting...</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                            Item Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="e.g., Premium UI Kit"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-white/90 mb-2">
                            Description *
                        </label>
                        <div data-color-mode="dark">
                            <MDEditor
                                value={description}
                                onChange={(value) => setDescription(value || '')}
                                height={300}
                                preview="edit"
                            />
                        </div>
                        <p className="text-xs text-white/50 mt-2">Use markdown to format your description</p>
                    </div>

                    {/* Category and Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-white/90 mb-2">
                                Category *
                            </label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                            >
                                <option value="">Select a category</option>
                                {Object.values(CATEGORIES).map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-white/90 mb-2">
                                Price (USDC) *
                            </label>
                            <input
                                type="number"
                                id="price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                                min="0"
                                step="0.01"
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                                placeholder="5.00"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-white/90 mb-2">
                            Tags
                        </label>
                        <input
                            type="text"
                            id="tags"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="Press Enter to add tags"
                        />
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="bg-white/10 text-white/90 px-3 py-1 text-sm flex items-center gap-2"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Item Images */}
                    <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                            Preview Images (Max 5)
                        </label>
                        {existingImages.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs text-white/50 mb-2">Existing images ({existingImages.length - removedExistingImages.length} remaining)</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {existingImages.map((img, i) => {
                                        const isRemoved = removedExistingImages.includes(img);
                                        if (isRemoved) return null;
                                        return (
                                            <div key={i} className="relative">
                                                <img
                                                    src={`/api/images/${img}`}
                                                    alt=""
                                                    className="w-full h-24 object-cover border border-white/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(img)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div
                            onDrop={handleImagesDrop}
                            onDragOver={handleImagesDragOver}
                            onDragLeave={handleImagesDragLeave}
                            className={`border-2 border-dashed transition-colors p-8 text-center ${isDraggingImages
                                ? 'border-white/40 bg-white/10'
                                : 'border-white/20 bg-white/5 hover:border-white/30'
                                }`}
                        >
                            <input
                                type="file"
                                id="itemImages"
                                onChange={handleImageChange}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />
                            <label htmlFor="itemImages" className="cursor-pointer">
                                <div className="text-white/60 mb-2">
                                    <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Drop images here or click to add more images</p>
                                    <p className="text-xs text-white/40 mt-1">Maximum 5 images total</p>
                                </div>
                            </label>
                        </div>
                        {itemImages.length > 0 && (
                            <div className="mt-3 grid grid-cols-5 gap-2">
                                {itemImages.map((file, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-24 object-cover border border-white/10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Digital File */}
                    <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                            Digital File (Optional - Update file if needed)
                        </label>
                        <div
                            onDrop={handleFileDrop}
                            onDragOver={handleFileDragOver}
                            onDragLeave={handleFileDragLeave}
                            className={`border-2 border-dashed transition-colors p-8 text-center ${isDraggingFile
                                ? 'border-white/40 bg-white/10'
                                : 'border-white/20 bg-white/5 hover:border-white/30'
                                }`}
                        >
                            <input
                                type="file"
                                id="digitalFile"
                                onChange={handleDigitalFileChange}
                                className="hidden"
                            />
                            <label htmlFor="digitalFile" className="cursor-pointer">
                                <div className="text-white/60">
                                    <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-sm">{digitalFile ? digitalFile.name : 'Drop file here or click to upload new file'}</p>
                                    {digitalFile && (
                                        <p className="text-xs text-white/40 mt-1">
                                            {(digitalFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Submit and Delete */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                        <Button
                            type="submit"
                            disabled={saving || deleting}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold p-6 transition-all text-lg"
                        >
                            {saving ? 'Saving Changes...' : 'Save Changes'}
                        </Button>

                        {/* Delete/Unlist Button */}
                        {!showDeleteConfirm ? (
                            <Button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={saving || deleting}
                                variant="outline"
                                className="w-full border-red-500/50 hover:bg-red-500/10 text-red-400 hover:text-red-300 p-6 text-lg"
                            >
                                {downloadCount === 0 ? 'Delete Item' : 'Unlist Item'}
                            </Button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 p-4 space-y-3">
                                <p className="text-red-200 text-sm">
                                    {downloadCount === 0
                                        ? 'Are you sure you want to permanently delete this item? This action cannot be undone.'
                                        : `This item has ${downloadCount} download(s). It will be unlisted and only visible to buyers who have already purchased it.`
                                    }
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {deleting ? 'Processing...' : (downloadCount === 0 ? 'Yes, Delete' : 'Yes, Unlist')}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={deleting}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </Layout>
    );
}
