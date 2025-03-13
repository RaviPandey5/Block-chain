# BlockVote - Secure Blockchain Voting Platform

A decentralized e-voting system powered by blockchain technology and secured with Aadhaar verification.

## Features

- Secure voting with blockchain technology
- Aadhaar verification for voter authentication
- Real-time voting results and analytics
- Community discussion platform
- Proposal creation and management
- Comprehensive audit trail

## Technologies Used

- React + TypeScript + Vite
- Wagmi for Ethereum interactions
- Ethers.js for blockchain communication
- Supabase for database and real-time subscriptions
- Tailwind CSS for styling

## Deployment Instructions for Netlify

### Prerequisites

- GitHub repository with your code
- Netlify account

### Environment Variables

Ensure the following environment variables are set in Netlify's deploy settings:

```
VITE_ENCRYPTION_KEY=your_encryption_key
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Deployment Steps

1. **Connect to GitHub**:
   - Log in to Netlify and click "New site from Git"
   - Select GitHub and authorize Netlify
   - Choose your repository

2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Add Environment Variables**:
   - Go to Site Settings > Build & Deploy > Environment
   - Add all required environment variables

4. **Deploy**:
   - Click "Deploy site"

### Post-Deployment Configuration

1. **Custom Domain**:
   - Go to Site Settings > Domain Management
   - Set up your custom domain if needed

2. **SSL/HTTPS**:
   - Netlify automatically provisions SSL certificates

3. **Content Security Policy**:
   - The `netlify.toml` file in the repository includes a permissive CSP
   - This allows MetaMask and other external resources to load properly

### Troubleshooting

If you encounter issues after deployment:

1. **White Screen / Blank Page**:
   - Check browser console for errors
   - Verify all environment variables are set correctly
   - Make sure the Content Security Policy allows necessary resources

2. **Wallet Connection Issues**:
   - Verify the CSP is properly configured
   - Check if wallet icons are loading from `/walletIcons/` path
   - Ensure MetaMask or other wallets are installed in the browser

3. **API Request Failures**:
   - Check Supabase credentials
   - Verify Alchemy API key is correct
   - Ensure contract address is valid

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT 