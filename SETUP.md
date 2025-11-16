# Quick Setup Guide

## Prerequisites

- Node.js 18+ or Bun
- MongoDB (local or Atlas)
- A wallet (MetaMask, Coinbase Wallet, etc.)

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
# Generate a secure secret
openssl rand -base64 32
```

Add to `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=x402bay

# NextAuth (REQUIRED)
NEXTAUTH_SECRET=<paste-the-generated-secret-here>
NEXTAUTH_URL=http://localhost:3000

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:**
Get connection string from https://cloud.mongodb.com

### 4. Run Development Server

```bash
bun run dev
```

### 5. Test the Application

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Approve wallet connection
4. **Sign the SIWE authentication message** (important!)
5. Navigate to `/upload`
6. Upload an item

## Authentication Flow

When you connect your wallet, you'll be prompted to:

1. **Connect** - Authorize the app to view your wallet address
2. **Sign** - Sign a message to prove wallet ownership (SIWE)

The signature is verified server-side and creates a secure session.

## Troubleshooting

### "Unauthorized: Please sign in with your wallet"

Make sure you:
- Signed the SIWE message (not just connected)
- Have `NEXTAUTH_SECRET` set in `.env.local`

### MongoDB Connection Error

- Check MongoDB is running: `mongosh` or check Atlas dashboard
- Verify `MONGODB_URI` in `.env.local`

### NextAuth Error

- Ensure `NEXTAUTH_URL` matches your dev server URL
- Check `NEXTAUTH_SECRET` is set (32+ characters)

## What's Different from Basic Auth?

### ✅ SIWE (Sign-In with Ethereum)

- Cryptographic proof of wallet ownership
- Industry-standard authentication (EIP-4361)
- No passwords, no email, no traditional login

### ✅ All MongoDB Through APIs

- No direct database access from client
- Proper authentication on all write operations
- RESTful API architecture

### ✅ NextAuth Session Management

- Secure JWT tokens in httpOnly cookies
- Built-in CSRF protection
- Automatic session handling

## Key Files

- `src/pages/api/auth/[...nextauth].ts` - Authentication configuration
- `src/lib/auth.ts` - Session verification utilities
- `src/pages/_app.tsx` - SIWE provider setup
- `src/pages/api/upload.ts` - Protected upload endpoint
- `API_AUTHENTICATION.md` - Full documentation

## Next Steps

- Read [API_AUTHENTICATION.md](API_AUTHENTICATION.md) for details
- Customize SIWE message in NextAuth config
- Add more protected endpoints
- Deploy to production with proper secrets
