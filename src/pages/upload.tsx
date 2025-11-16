import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '@/components/layout';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import CONSTANTS from "@/lib/constants";
const { TOKENS, CHAINS, CATEGORIES } = CONSTANTS;

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

// Get the first available chain and token as default
const getDefaultToken = () => {
  const firstChainId = Object.keys(TOKENS)[0];
  const firstTokenSymbol = Object.keys(TOKENS[firstChainId])[0];
  return `${firstChainId}:${firstTokenSymbol}`;
};

export default function Upload() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [price, setPrice] = useState('5');
  const [token, setToken] = useState(getDefaultToken());
  const [itemImages, setItemImages] = useState<File[]>([]);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addImages(files);
    }
  };

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (itemImages.length + imageFiles.length > 5) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!digitalFile) {
      setError('Please select a digital file to sell');
      return;
    }

    if (itemImages.length === 0) {
      setError('Please add at least one preview image');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags));
      formData.append('price', price);
      formData.append('token', token);
      formData.append('uploaderAddress', address);
      formData.append('digitalFile', digitalFile);

      // Append all item images
      itemImages.forEach((image, index) => {
        formData.append(`itemImage${index}`, image);
      });
      formData.append('itemImagesCount', itemImages.length.toString());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await response.json();

      // Redirect to the browse page after successful upload
      router.push('/browse');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="w-full mt-5 max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Add item for sale</h1>
          <p className="text-lg text-white/60">List your digital file for sale on the marketplace</p>
        </div>

        {!isConnected ? (
          <div className="bg-white/5 border border-white/10 p-16 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Wallet Connection Required</h3>
            <p className="text-white/60 mb-6">Please connect your wallet to upload files</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                placeholder="Enter a name for your listing"
                required
              />
            </div>

            {/* Item Images */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Item Images <span className="text-white/50">(Max 5, first will be thumbnail)</span>
              </label>
              <div className="space-y-3">
                {itemImages.length < 5 && (
                  <div
                    className={`relative border-2 border-dashed transition-colors ${isDraggingImages
                      ? 'border-white/50 bg-white/10'
                      : 'border-white/20 bg-white/5'
                      }`}
                    onDrop={handleImagesDrop}
                    onDragOver={handleImagesDragOver}
                    onDragLeave={handleImagesDragLeave}
                  >
                    <div className="p-8 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-white/40 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-white/60 mb-2">
                        {isDraggingImages ? 'Drop images here' : 'Drag and drop images here'}
                      </p>
                      <p className="text-white/40 text-sm mb-4">or</p>
                      <label
                        htmlFor="itemImages"
                        className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium cursor-pointer transition-colors"
                      >
                        Browse Files
                      </label>
                      <input
                        type="file"
                        id="itemImages"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
                {itemImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-3">
                    {itemImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover border border-white/20"
                        />
                        {index === 0 && (
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5">
                            Thumbnail
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-white/90 mb-2">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                required
              >
                <option value="" className="bg-black text-white">Select a category</option>
                {Object.values(CATEGORIES).map((category) => (
                  <option key={category.id} value={category.id} className="bg-black text-white">
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white/90 mb-2">
                Description <span className="text-white/50">(Markdown supported)</span>
              </label>
              <div data-color-mode="dark">
                <MDEditor
                  value={description}
                  onChange={(value) => setDescription(value || '')}
                  preview="live"
                  height={400}
                  textareaProps={{
                    placeholder: 'Describe what buyers will get. You can use markdown for formatting...',
                  }}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-white/90 mb-2">
                Tags <span className="text-white/50">(Press Enter to add)</span>
              </label>
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                placeholder="Add tags to help buyers find your item"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-white/20 text-white px-3 py-1 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-white/60 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price and Token */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-white/90 mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-white/50">$</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                    placeholder="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="token" className="block text-sm font-medium text-white/90 mb-2">
                  Payment Token
                </label>
                <select
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  required
                >
                  {Object.keys(TOKENS).map((chainId) => {
                    const chainName = CHAINS[chainId]?.name || 'Unknown Chain';
                    const availableTokens = TOKENS[chainId];
                    return Object.keys(availableTokens).map((tokenName) => {
                      const value = `${chainId}:${tokenName}`;
                      return (
                        <option key={value} value={value} className="bg-black text-white">
                          {tokenName} ({chainName})
                        </option>
                      );
                    });
                  })}
                </select>
              </div>
            </div>

            {/* Digital File */}
            <div>
              <label htmlFor="digitalFile" className="block text-sm font-medium text-white/90 mb-2">
                Digital File <span className="text-white/50">(The actual file being sold)</span>
              </label>
              <div
                className={`relative border-2 border-dashed transition-colors ${isDraggingFile
                  ? 'border-white/50 bg-white/10'
                  : 'border-white/20 bg-white/5'
                  }`}
                onDrop={handleFileDrop}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
              >
                <div className="p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-white/40 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-white/60 mb-2">
                    {isDraggingFile ? 'Drop file here' : 'Drag and drop your file here'}
                  </p>
                  <p className="text-white/40 text-sm mb-4">or</p>
                  <label
                    htmlFor="digitalFile"
                    className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium cursor-pointer transition-colors"
                  >
                    Browse Files
                  </label>
                  <input
                    type="file"
                    id="digitalFile"
                    onChange={handleDigitalFileChange}
                    className="hidden"
                    required
                  />
                </div>
              </div>
              {digitalFile && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10">
                  <p className="text-sm text-white/90 font-medium">{digitalFile.name}</p>
                  <p className="text-xs text-white/60 mt-1">
                    {(digitalFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-white/10 border border-white/20 p-4">
                <p className="text-white/90 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-medium py-3 px-6 transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload & List'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/browse')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
