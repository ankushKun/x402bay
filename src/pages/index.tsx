import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { GetServerSideProps } from 'next';
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListingPreview from "@/components/listing-preview";
import { FileItem } from '@/lib/models';
import Link from "next/link";

interface Category {
  id: number;
  label: string;
}

interface HomeProps {
  items: FileItem[];
}

export default function Home({ items: initialItems }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<FileItem[]>(initialItems);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/items/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Filter items by category when category changes
  useEffect(() => {
    if (selectedCategory === null) {
      setItems(initialItems);
    } else {
      setItems(initialItems.filter(item => item.category === selectedCategory));
    }
    setSearchPerformed(false);
    setSearchQuery("");
  }, [selectedCategory, initialItems]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search query is empty, reset based on category selection
      if (selectedCategory === null) {
        setItems(initialItems);
      } else {
        setItems(initialItems.filter(item => item.category === selectedCategory));
      }
      setSearchPerformed(false);
      return;
    }

    setIsSearching(true);
    try {
      // Build URL with optional category parameter
      let url = `/api/items/search?q=${encodeURIComponent(searchQuery)}`;
      if (selectedCategory !== null) {
        url += `&category=${selectedCategory}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setItems(data.items);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (selectedCategory === null) {
      setItems(initialItems);
    } else {
      setItems(initialItems.filter(item => item.category === selectedCategory));
    }
    setSearchPerformed(false);
  };

  const handleCategoryClick = (categoryId: number) => {
    if (selectedCategory === categoryId) {
      // Deselect if clicking the same category
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-4 items-start w-full grow mt-5">
        <div className="flex flex-col items-center justify-center col-span-1 pt-4">
          <div className="font-medium text-left w-full pl-0.5 text-xs pb-1 text-white/90 uppercase">What are you looking for today?</div>
          <div className="flex w-full">
            <Input
              className="bg-white/5 border border-white/10 rounded-none w-full text-white/90 placeholder:text-white/50"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
            <Button
              variant="secondary"
              className="rounded-none bg-white/20 text-white scale-90 border border-white/30 hover:bg-white/30"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? "..." : "Search"}
            </Button>
          </div>
          {searchPerformed && (
            <div className="w-full">
              <Button
                variant="link"
                className="p-0 h-4 text-xs w-full"
                onClick={handleClearSearch}
              >
                Clear search
              </Button>
            </div>
          )}

          {/* Categories */}
          <div className="w-full mt-6">
            <div className="font-medium text-left w-full pl-0.5 text-xs pb-2 text-white/90 uppercase">Categories</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className={`cursor-pointer text-xs px-3 py-1 transition-colors ${selectedCategory === category.id
                    ? "bg-white/30 text-white border-white/40 hover:bg-white/40"
                    : "bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white/90"
                    }`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.label}
                </Badge>
              ))}
            </div>
            {selectedCategory !== null && (
              <div className="w-full mt-2">
                <Button
                  variant="link"
                  className="p-0 h-4 text-xs w-full"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear category
                </Button>
              </div>
            )}
          </div>
          <Link href="/upload" className="w-full">
            <Button variant="secondary" className="h-10 mt-8 w-full flex items-center justify-center rounded-none">SELL AN ITEM</Button>
          </Link>
        </div>
        <div className="flex items-start justify-center col-span-3 px-6">
          <div className="w-full max-w-4xl">
            {(searchPerformed || selectedCategory !== null) && (
              <div className="text-white/70 text-sm mb-2 mt-4">
                {searchPerformed && selectedCategory !== null && (
                  <>Found {items.length} {items.length === 1 ? 'result' : 'results'} for "{searchQuery}" in {categories.find(c => c.id === selectedCategory)?.label}</>
                )}
                {searchPerformed && selectedCategory === null && (
                  <>Found {items.length} {items.length === 1 ? 'result' : 'results'} for "{searchQuery}"</>
                )}
                {!searchPerformed && selectedCategory !== null && (
                  <>Showing {items.length} {items.length === 1 ? 'item' : 'items'} in {categories.find(c => c.id === selectedCategory)?.label}</>
                )}
              </div>
            )}
            {items.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-12 text-center mt-4">
                <p className="text-white/90 text-base mb-4 font-semibold">
                  {searchPerformed ? 'No results found' : 'No listings available yet'}
                </p>
                <p className="text-white/50 text-sm">
                  {searchPerformed ? 'Try a different search term' : 'Check back soon for new items!'}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                {items.map((item) => (
                  <Link key={item.id} href={`/listing/${item.id}`}>
                    <ListingPreview listing={item} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Fetch items from API endpoint instead of directly from MongoDB
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/items`);

    if (!response.ok) {
      throw new Error('Failed to fetch items');
    }

    const { items } = await response.json();

    return {
      props: {
        items,
      },
    };
  } catch (error) {
    console.error('Error fetching items:', error);
    return {
      props: {
        items: [],
      },
    };
  }
};

