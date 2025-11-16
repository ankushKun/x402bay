import { base, baseSepolia } from "viem/chains";

const CHAINS = {
    [`${baseSepolia.id}`]: baseSepolia,
    // [`${base.id}`]: base,
}

const CHAIN_LOGOS: Record<string, string> = {
    [baseSepolia.id]: "/chains/base.svg",
    // [base.id]: "/chains/base.svg",
}

interface TokenData {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logo: string;
}

const TOKENS: Record<string, Record<string, TokenData>> = {
    [`${baseSepolia.id}`]: {
        USDC: {
            symbol: "USDC",
            name: "USD Coin",
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            decimals: 6,
            logo: "/tokens/usdc.svg",
        }
    },
    // [`${base.id}`]: {
    //     USDC: {
    //         symbol: "USDC",
    //         name: "USD Coin",
    //         address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //         decimals: 6,
    //         logo: "/tokens/usdc.svg",
    //     }
    // },
}

const CATEGORIES = {
    GRAPGHICS_TEMPLATES: { id: 1, label: "Graphics & Templates" },
    PHOTOGRAPHY_STOCK: { id: 2, label: "Photography & Stock Images" },
    VIDEO_MOTION: { id: 3, label: "Video & Motion Graphics" },
    AUDIO_MUSIC: { id: 4, label: "Audio & Music" },
    MODELS_3D: { id: 5, label: "3D Models & Assets" },
    UI_UX_KITS: { id: 6, label: "UI/UX Kits & Design Systems" },
    CODE_SCRIPTS: { id: 7, label: "Code & Scripts" },
    PLUGINS_EXTENSIONS: { id: 8, label: "Plugins & Extensions" },
    THEMES_TEMPLATES: { id: 9, label: "Themes & Templates" },
    EBOOKS_GUIDES: { id: 10, label: "E-books & Guides" },
    GAME_MODS: { id: 11, label: "Game Mods" },
    AI_MODELS: { id: 12, label: "AI Models & Prompts" },
    DATASETS: { id: 13, label: "Datasets" },
    NOTION_TEMPLATES: { id: 14, label: "Notion Templates" },
    SPREADSHEET_TEMPLATES: { id: 15, label: "Spreadsheet Templates" },
    OTHERS: { id: 0, label: "Others" },
}

const idToCategoryMapping = Object.fromEntries(
    Object.values(CATEGORIES).map(category => [category.id, category.label])
);

export function getCategoryLabel(categoryId: number): string {
    return idToCategoryMapping[categoryId] || "Unknown";
}

export default {
    CHAINS,
    TOKENS,
    CATEGORIES,
    CHAIN_LOGOS,
}