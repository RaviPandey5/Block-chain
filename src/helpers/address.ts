/**
 * Format an Ethereum address to show only the first 6 and last 4 characters
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  
  // Ensure the address is a string and properly formatted
  const formattedAddress = address.toLowerCase();
  
  // If address is too short, return it as is
  if (formattedAddress.length <= 10) return formattedAddress;
  
  // Return first 6 and last 4 characters
  return `${formattedAddress.substring(0, 6)}...${formattedAddress.substring(formattedAddress.length - 4)}`;
}

/**
 * Get Etherscan URL for an address or transaction
 */
export function getEtherscanUrl(hash: string, type: 'address' | 'tx' = 'address'): string {
  // Default to Sepolia testnet
  const network = 'sepolia';
  const baseUrl = `https://${network}.etherscan.io`;
  
  return `${baseUrl}/${type}/${hash}`;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
} 