import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { cn } from '../lib/utils';
import { formatAddress } from '../helpers/address';

interface WalletButtonProps {
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function WalletButton({ variant = "default", size = "default", className = "" }: WalletButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    // Find MetaMask connector
    const metaMaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'));
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const baseClasses = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-full font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all",
    {
      "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700": variant === "default",
      "bg-gray-800 text-white hover:bg-gray-700": variant === "secondary",
      "bg-transparent border border-white/20 text-white hover:bg-white/5": variant === "outline",
      "px-4 py-2 text-sm": size === "default",
      "px-3 py-2 text-xs": size === "sm",
      "px-6 py-3 text-base": size === "lg",
    },
    className
  );

  return (
    <div className="relative">
      {isConnected ? (
        <div className="relative">
          <button
            onClick={handleToggleExpand}
            className={baseClasses}
          >
            <img 
              src="/walletIcons/metamask.svg" 
              alt="MetaMask" 
              className="w-5 h-5"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSIyMCIgZmlsbD0iI0YwQjkwQiIvPjxwYXRoIGQ9Ik0yNy40ODUgOS43NTcgMjEuOTM2IDE1LjkzOWwyLjI0OS0wLjg5N2w0LjM4NC0yLjgxMy0xLjA4NC0yLjQ3MnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+";
                console.log("Using fallback MetaMask icon");
              }}
            />
            <span>{formatAddress(address || '')}</span>
          </button>
          
          {isExpanded && (
            <div className="absolute right-0 mt-2 py-2 w-48 bg-gray-900 rounded-lg shadow-xl z-50 border border-white/10">
              <div className="px-4 py-2 text-sm text-gray-300 border-b border-white/10">
                Connected as:<br />
                <span className="font-mono text-white">{formatAddress(address || '')}</span>
              </div>
              <button
                onClick={() => {
                  handleDisconnect();
                  setIsExpanded(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className={baseClasses}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Connecting{pendingConnector?.name ? ` to ${pendingConnector.name}` : ''}...</span>
            </>
          ) : (
            <>
              <img 
                src="/walletIcons/metamask.svg" 
                alt="MetaMask" 
                className="w-5 h-5" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSIyMCIgZmlsbD0iI0YwQjkwQiIvPjxwYXRoIGQ9Ik0yNy40ODUgOS43NTcgMjEuOTM2IDE1LjkzOWwyLjI0OS0wLjg5N2w0LjM4NC0yLjgxMy0xLjA4NC0yLjQ3MnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+";
                  console.log("Using fallback MetaMask icon");
                }}
              />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}
    </div>
  );
} 