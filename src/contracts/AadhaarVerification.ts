import { ethers, providers } from 'ethers';
import CryptoJS from 'crypto-js';

export interface AadhaarVerification {
  isVerified: boolean;
  encryptedAadhaar: string;
  timestamp: number;
}

const CONTRACT_ABI = [
  "function verifyAadhaar(bytes32 _encryptedAadhaar) external",
  "function isVerified(address user) external view returns (bool)",
  "function getVerificationDetails(address user) external view returns (tuple(bool isVerified, bytes32 encryptedAadhaar, uint256 timestamp))",
  "function usedAadhaar(bytes32) external view returns (bool)"
];

export class AadhaarVerificationContract {
  private contract: ethers.Contract;
  private readonly ENCRYPTION_KEY: string;

  constructor(provider: providers.Provider) {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY;

    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    this.ENCRYPTION_KEY = encryptionKey;
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
  }

  private encryptAadhaar(aadhaarNumber: string): string {
    try {
      const key = CryptoJS.enc.Utf8.parse(this.ENCRYPTION_KEY);
      const encrypted = CryptoJS.AES.encrypt(aadhaarNumber, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });

      // Convert to bytes32 format
      const encryptedHex = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(encrypted.toString())
      );
      return ethers.utils.hexZeroPad(encryptedHex, 32);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt Aadhaar number');
    }
  }

  private async validateAadhaarFormat(aadhaarNumber: string): Promise<boolean> {
    // Remove any spaces or special characters
    const cleanedNumber = aadhaarNumber.replace(/[^0-9]/g, '');
    console.log('Validating Aadhaar:', {
      original: aadhaarNumber,
      cleaned: cleanedNumber,
      length: cleanedNumber.length
    });
    
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(cleanedNumber);
  }

  async verifyAadhaar(
    aadhaarNumber: string, 
    signer: providers.JsonRpcSigner
  ): Promise<ethers.ContractTransaction> {
    try {
      // Clean and validate the Aadhaar number
      const cleanedAadhaar = aadhaarNumber.replace(/[^0-9]/g, '');
      
      if (cleanedAadhaar.length !== 12) {
        throw new Error(`Invalid Aadhaar number length. Got ${cleanedAadhaar.length} digits, need 12 digits.`);
      }

      // Connect contract with signer
      const contractWithSigner = this.contract.connect(signer);

      // Encrypt Aadhaar number and ensure it's in bytes32 format
      const encryptedAadhaar = this.encryptAadhaar(cleanedAadhaar);
      
      // Estimate gas for the transaction
      const gasEstimate = await contractWithSigner.estimateGas.verifyAadhaar(encryptedAadhaar);
      
      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      console.log('Submitting verification with parameters:', {
        encryptedAadhaar,
        gasLimit: gasLimit.toString(),
      });

      // Submit the transaction with estimated gas
      const tx = await contractWithSigner.verifyAadhaar(
        encryptedAadhaar,
        {
          gasLimit,
        }
      );

      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation with 2 blocks
      const receipt = await tx.wait(2);
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed during execution');
      }

      console.log('Transaction confirmed:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });

      return tx;

    } catch (error: any) {
      console.error('Verification error details:', {
        error,
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason
      });

      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason?.includes('already verified')) {
          throw new Error('This wallet is already verified with an Aadhaar number');
        }
        if (error.reason?.includes('already used')) {
          throw new Error('This Aadhaar number is already registered with another wallet');
        }
        throw new Error('Transaction failed: Please check your wallet has enough funds and try again');
      }

      throw error;
    }
  }

  async isAadhaarVerified(address: string): Promise<boolean> {
    if (!ethers.utils.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    return await this.contract.isVerified(address);
  }

  async getVerificationDetails(address: string): Promise<AadhaarVerification> {
    if (!ethers.utils.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    const details = await this.contract.getVerificationDetails(address);
    return {
      isVerified: details[0],
      encryptedAadhaar: details[1],
      timestamp: details[2].toNumber()
    };
  }
} 