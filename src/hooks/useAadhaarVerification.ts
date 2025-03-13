import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useNetwork, useDisconnect } from 'wagmi';
import { type WalletClient } from 'wagmi';
import { providers } from 'ethers';
import Tesseract from 'tesseract.js';
import { AadhaarVerificationContract } from '../contracts/AadhaarVerification';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

interface VerificationState {
  isVerified: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface VerificationDetails {
  isVerified: boolean;
  encryptedAadhaar: string;
  timestamp: number;
}

export function useAadhaarVerification() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const [verificationState, setVerificationState] = useState<VerificationState>({
    isVerified: false,
    isLoading: false,
    error: null
  });

  // Reset state when wallet disconnects
  const resetState = () => {
    setVerificationState({
      isVerified: false,
      isLoading: false,
      error: null
    });
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect();
    resetState();
  };

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
    return new AadhaarVerificationContract(provider);
  };

  // Get verification details
  const getVerificationDetails = async (userAddress: string): Promise<VerificationDetails> => {
    const contract = getContract();
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const details = await contract.getVerificationDetails(userAddress);
      return {
        isVerified: details.isVerified,
        encryptedAadhaar: details.encryptedAadhaar,
        timestamp: details.timestamp
      };
    } catch (error) {
      console.error('Error getting verification details:', error);
      throw new Error('Failed to get verification details');
    }
  };

  // Extract Aadhaar number from image using OCR
  const extractAadhaarFromImage = async (file: File): Promise<string> => {
    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        { logger: () => {} }
      );

      // Extract Aadhaar number using regex
      const aadhaarRegex = /\b[2-9]{1}[0-9]{11}\b/;
      const match = result.data.text.match(aadhaarRegex);

      if (!match) {
        throw new Error('No valid Aadhaar number found in the image');
      }

      return match[0];
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract Aadhaar number from image');
    }
  };

  // Verify using uploaded Aadhaar card
  const verifyWithAadhaarCard = async (file: File): Promise<void> => {
    if (!address || !walletClient || !chain) {
      throw new Error('Please connect your wallet and ensure you are on the correct network.');
    }

    const contract = getContract();
    if (!contract) {
      throw new Error('Contract not initialized. Please check your network connection.');
    }

    setVerificationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Extract Aadhaar number from image
      const aadhaarNumber = await extractAadhaarFromImage(file);

      // Get signer
      const signer = getEthersSigner(walletClient);
      if (!signer) {
        throw new Error('Failed to initialize signer');
      }

      // Submit verification with just the Aadhaar number and signer
      const tx = await contract.verifyAadhaar(aadhaarNumber, signer);
      await tx.wait(2); // Wait for 2 block confirmations

      setVerificationState(prev => ({ ...prev, isVerified: true }));
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState(prev => ({ ...prev, error: error as Error }));
      throw error;
    } finally {
      setVerificationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Verify using manually entered Aadhaar number
  const verifyWithAadhaarNumber = async (aadhaarNumber: string): Promise<void> => {
    if (!walletClient || !chain) {
      throw new Error('Please connect your wallet and ensure you are on the correct network.');
    }

    const contract = getContract();
    if (!contract) {
      throw new Error('Contract not initialized. Please check your network connection.');
    }

    setVerificationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Clean the Aadhaar number
      const cleanedAadhaar = aadhaarNumber.replace(/[^0-9]/g, '');
      
      console.log('Verifying Aadhaar:', {
        original: aadhaarNumber,
        cleaned: cleanedAadhaar,
        length: cleanedAadhaar.length
      });

      if (cleanedAadhaar.length !== 12) {
        throw new Error(`Invalid Aadhaar number length. Got ${cleanedAadhaar.length} digits, need 12 digits.`);
      }

      const signer = getEthersSigner(walletClient);
      if (!signer) {
        throw new Error('Failed to initialize signer');
      }

      // Call verifyAadhaar with just the cleaned number and signer
      const tx = await contract.verifyAadhaar(cleanedAadhaar, signer);
      
      console.log('Waiting for transaction confirmation...');
      await tx.wait(2); // Wait for 2 block confirmations

      setVerificationState(prev => ({ ...prev, isVerified: true }));
      console.log('Verification successful!');
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.reason || error.message || 'Unknown error occurred';
      setVerificationState(prev => ({ 
        ...prev, 
        error: new Error(errorMessage.includes('transaction failed') 
          ? 'Transaction failed. Please check your wallet has enough funds and try again.'
          : errorMessage
        ) 
      }));
      throw error;
    } finally {
      setVerificationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Convert bytes32 to string safely
  const safeBytes32ToString = (bytes32: string): string => {
    try {
      // Remove null bytes and try direct conversion first
      const cleaned = bytes32.replace(/0x0+/g, '0x');
      return ethers.utils.toUtf8String(cleaned);
    } catch (error) {
      console.error('Error in direct conversion, trying alternative method:', error);
      try {
        // Alternative method: remove '0x' prefix and convert each byte
        const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
        const bytes = Buffer.from(hex, 'hex');
        return bytes.toString('utf8').replace(/\0+$/, '');
      } catch (error) {
        console.error('Both conversion methods failed:', error);
        throw new Error('Failed to convert bytes32 to string');
      }
    }
  };

  // Decrypt Aadhaar number
  const decryptAadhaar = (encryptedAadhaar: string): string => {
    try {
      const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('Encryption key not configured');
      }

      console.log('Attempting to decrypt:', { 
        encryptedAadhaar,
        keyLength: encryptionKey.length
      });

      // Convert bytes32 to string using safe method
      const encryptedString = safeBytes32ToString(encryptedAadhaar);

      console.log('Converted from bytes32:', {
        encryptedString
      });

      const key = CryptoJS.enc.Utf8.parse(encryptionKey);
      const decrypted = CryptoJS.AES.decrypt(encryptedString, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = decrypted.toString(CryptoJS.enc.Utf8);
      console.log('Decryption result:', { 
        resultLength: result.length,
        isValidFormat: /^\d{12}$/.test(result)
      });

      // Validate the decrypted result
      if (!result || !/^\d{12}$/.test(result)) {
        console.error('Invalid decryption result:', {
          result,
          length: result.length,
          isNumeric: /^\d+$/.test(result)
        });
        throw new Error('Invalid decryption result');
      }

      return result;
    } catch (error) {
      console.error('Decryption error details:', error);
      throw new Error('Failed to decrypt Aadhaar number. Please ensure you are the owner of this verification.');
    }
  };

  // Reset state when wallet changes or disconnects
  useEffect(() => {
    if (!isConnected) {
      resetState();
    }
  }, [isConnected, address]);

  // Check verification status on mount and when address/chain changes
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!address || !walletClient || !chain) return;

      const contract = getContract();
      if (!contract) return;

      try {
        const details = await getVerificationDetails(address);
        setVerificationState(prev => ({ ...prev, isVerified: details.isVerified }));
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    if (isConnected) {
      checkVerificationStatus();
    }
  }, [address, walletClient, chain, isConnected]);

  return {
    ...verificationState,
    verifyWithAadhaarCard,
    verifyWithAadhaarNumber,
    getVerificationDetails,
    decryptAadhaar,
    disconnect: handleDisconnect,
    resetState
  };
} 