import { ethers, providers } from 'ethers';

export interface Identity {
  isVerified: boolean;
  documentHash: string;
  timestamp: number;
}

const CONTRACT_ABI = [
  "function verifyIdentity(address _address, bytes32 _documentHash) external",
  "function isIdentityVerified(address _address) external view returns (bool)",
  "function getIdentityDetails(address _address) external view returns (tuple(bool isVerified, bytes32 documentHash, uint256 timestamp))"
];

export class IdentityVerificationContract {
  private contract: ethers.Contract;

  constructor(provider: providers.Provider) {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
  }

  async verifyIdentity(address: string, documentHash: string, signer: providers.JsonRpcSigner): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.contract.connect(signer);
    return await contractWithSigner.verifyIdentity(address, documentHash);
  }

  async isIdentityVerified(address: string): Promise<boolean> {
    return await this.contract.isIdentityVerified(address);
  }

  async getIdentityDetails(address: string): Promise<Identity> {
    const details = await this.contract.getIdentityDetails(address);
    return {
      isVerified: details[0],
      documentHash: details[1],
      timestamp: details[2].toNumber()
    };
  }
} 