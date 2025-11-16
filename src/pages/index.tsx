import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { useState } from "react";
import { GetServerSideProps } from 'next';
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ListingPreview from "@/components/listing-preview";
import { FileItem } from '@/lib/models';
import Link from "next/link";

interface HomeProps {
  items: FileItem[];
}

export default function Home({ items }: HomeProps) {
  return (
    <Layout>
      <div className="grid grid-cols-4 items-start w-full grow mt-5">
        <div className="flex flex-col items-center justify-center col-span-1 pt-4">
          <div className="font-medium text-left w-full pl-0.5 text-sm text-white/90 uppercase">What are you looking for today?</div>
          <div className="flex w-full">
            <Input className="bg-white/5 border border-white/10 rounded-none w-full text-white/90 placeholder:text-white/50" placeholder="Search items..." />
            <Button variant="secondary" className="rounded-none bg-white/20 text-white scale-90 border border-white/30 hover:bg-white/30">Search</Button>
          </div>
        </div>
        <div className="flex items-start justify-center col-span-3 px-6">
          <div className="w-full max-w-4xl">
            {items.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-12 text-center mt-4">
                <p className="text-white/90 text-base mb-4 font-semibold">No listings available yet</p>
                <p className="text-white/50 text-sm">Check back soon for new items!</p>
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

