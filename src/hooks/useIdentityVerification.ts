import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useNetwork } from 'wagmi';
import { type WalletClient } from 'wagmi';
import { providers, ethers } from 'ethers';
import { utils } from 'ethers';
import { IdentityVerificationContract, Identity } from '../contracts/IdentityVerification';

export function useIdentityVerification() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { chain } = useNetwork();
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [identityDetails, setIdentityDetails] = useState<Identity | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // Convert wallet client to ethers signer
    const getEthersSigner = (walletClient: WalletClient) => {
        if (!walletClient || !chain) return null;
        
        const { account, transport } = walletClient;
        const network = {
            chainId: chain.id,
            name: chain.name,
            ensAddress: chain.contracts?.ensRegistry?.address,
        };
        const provider = new providers.Web3Provider(transport, network);
        return provider.getSigner(account.address);
    };

    // Create contract instance
    const getContract = () => {
        if (!walletClient || !chain) return null;
        const provider = new providers.Web3Provider(walletClient.transport, {
            chainId: chain.id,
            name: chain.name,
            ensAddress: chain.contracts?.ensRegistry?.address
        });
        return new IdentityVerificationContract(provider);
    };

    useEffect(() => {
        if (address) {
            checkVerificationStatus();
        }
    }, [address, walletClient, chain]);

    const checkVerificationStatus = async () => {
        if (!address || !walletClient || !chain) return;
        
        const contract = getContract();
        if (!contract) {
            setError(new Error('Contract not initialized. Please check your network connection.'));
            return;
        }
        
        try {
            setIsLoading(true);
            const verified = await contract.isIdentityVerified(address);
            setIsVerified(verified);
            
            if (verified) {
                const details = await contract.getIdentityDetails(address);
                setIdentityDetails(details);
            }
            setError(null);
        } catch (err) {
            console.error('Error checking verification status:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const submitVerification = async (documentData: File): Promise<void> => {
        if (!address || !walletClient || !chain) {
            throw new Error('Please connect your wallet and ensure you are on the correct network.');
        }

        const contract = getContract();
        if (!contract) {
            throw new Error('Contract not initialized. Please check your network connection.');
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Create a hash of the document
            const buffer = await documentData.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const documentHash = utils.keccak256(bytes);
            
            // Submit verification transaction
            const signer = getEthersSigner(walletClient);
            if (!signer) {
                throw new Error('Failed to initialize signer. Please check your wallet connection.');
            }

            const tx = await contract.verifyIdentity(address, documentHash, signer);
            await tx.wait();
            
            // Update status
            await checkVerificationStatus();
        } catch (err) {
            console.error('Verification error:', err);
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isVerified,
        identityDetails,
        isLoading,
        error,
        submitVerification,
        checkVerificationStatus
    };
} 