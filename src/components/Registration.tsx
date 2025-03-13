import React, { useState, useEffect } from 'react';
import { Wallet, Shield, Mail, Upload, CheckCircle, XCircle, Copy, FileSearch, Eye, EyeOff } from 'lucide-react';
import { useAccount, useConnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { sepolia } from 'wagmi/chains';
import { useAadhaarVerification } from '../hooks/useAadhaarVerification';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const Registration = () => {
  console.log('Rendering Registration component'); // Debug log

  const { address, isConnected } = useAccount();
  const { connect, isLoading: isConnecting, error: connectError } = useConnect({
    chainId: sepolia.id
  });
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const [error, setError] = React.useState<Error | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [extractedAadhaar, setExtractedAadhaar] = React.useState<string>('');
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [aadhaarNumber, setAadhaarNumber] = React.useState<string>('');
  const [verificationMethod, setVerificationMethod] = React.useState<'upload' | 'manual'>('upload');
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [decryptedAadhaar, setDecryptedAadhaar] = useState<string | null>(null);
  
  const {
    isVerified,
    isLoading: verificationLoading,
    error: verificationError,
    verifyWithAadhaarCard,
    verifyWithAadhaarNumber,
    getVerificationDetails,
    decryptAadhaar,
    disconnect
  } = useAadhaarVerification();

  useEffect(() => {
    console.log('Component mounted with states:', {
      isConnected,
      address,
      isVerified,
      chain
    });
  }, []);

  useEffect(() => {
    const fetchVerificationDetails = async () => {
      if (isConnected && address && isVerified) {
        try {
          console.log('Fetching verification details for:', address);
          const details = await getVerificationDetails(address);
          console.log('Fetched details:', details);
          setVerificationDetails(details);
        } catch (err) {
          console.error('Error fetching verification details:', err);
          setError(err as Error);
        }
      }
    };

    fetchVerificationDetails();
  }, [isConnected, address, isVerified, getVerificationDetails]);

  const handleConnect = async () => {
    try {
      if (isConnected) {
        disconnect();
        setSelectedFile(null);
        setAadhaarNumber('');
      } else {
        const connector = new MetaMaskConnector({
          chains: [sepolia],
          options: {
            shimDisconnect: true,
            UNSTABLE_shimOnConnectSelectAccount: true,
          },
        });
        await connect({ connector });
      }
      setError(null);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err as Error);
    }
  };

  const handleSwitchNetwork = () => {
    if (switchNetwork) {
      switchNetwork(sepolia.id);
    }
  };

  const extractAadhaarWithGemini = async (file: File): Promise<string | null> => {
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Convert the file to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove the data URL prefix
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // Create a more specific prompt for better accuracy
      const prompt = `Please analyze this Aadhaar card image and extract ONLY the 12-digit Aadhaar number.
      - The number should be in format: XXXX XXXX XXXX
      - Return only the digits, no other text
      - Ensure the number starts with a digit between 2-9
      - The number in the image is clearly visible`;

      // Generate content with safety settings
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: file.type
          }
        }
      ]);

      const response = await result.response;
      const text = response.text().trim();

      // Clean up the extracted number (remove spaces and any non-digit characters)
      const cleanNumber = text.replace(/[^0-9]/g, '');

      // Validate that we have a 12-digit number starting with 2-9
      if (cleanNumber.length === 12 && /^[2-9]\d{11}$/.test(cleanNumber)) {
        console.log('Successfully extracted Aadhaar number');
        return cleanNumber;
      }

      console.error('Invalid number format:', { cleanNumber, length: cleanNumber.length });
      throw new Error('Could not find a valid Aadhaar number in the image');
    } catch (error) {
      console.error('Error extracting Aadhaar number:', error);
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error('The OCR service is temporarily unavailable. Please try entering the number manually.');
      }
      throw new Error('Could not find a valid Aadhaar number in the image. Please ensure the number is clearly visible or try entering it manually.');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsExtracting(true);
      setError(null);
      
      try {
        // Try extracting with Gemini first
        const extractedNumber = await extractAadhaarWithGemini(file);
        
        if (!extractedNumber) {
          throw new Error('Could not find a valid Aadhaar number in the image. Please ensure the number is clearly visible or try entering it manually.');
        }

        setExtractedAadhaar(extractedNumber);
      } catch (error) {
        console.error('Extraction Error:', error);
        setError(error instanceof Error ? error : new Error('Failed to extract Aadhaar number'));
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleVerification = async () => {
    try {
      if (verificationMethod === 'upload' && selectedFile) {
        // Use the verified number instead of re-extracting
        await verifyWithAadhaarNumber(extractedAadhaar);
        setSelectedFile(null);
        setExtractedAadhaar('');
      } else if (verificationMethod === 'manual' && aadhaarNumber) {
        await verifyWithAadhaarNumber(aadhaarNumber);
        setAadhaarNumber('');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err as Error);
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isWrongNetwork = isConnected && chain?.id !== sepolia.id;
  const isLoading = verificationLoading;

  const handleToggleDecryption = async () => {
    try {
      if (!showDecrypted && verificationDetails) {
        console.log('Attempting to decrypt Aadhaar');
        const decrypted = decryptAadhaar(verificationDetails.encryptedAadhaar);
        console.log('Decryption successful');
        setDecryptedAadhaar(decrypted);
      } else {
        setDecryptedAadhaar(null);
      }
      setShowDecrypted(!showDecrypted);
    } catch (err) {
      console.error('Decryption error:', err);
      setError(err as Error);
    }
  };

  if (error) {
    console.error('Component error:', error);
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-heading" data-text="Voter Registration">
            Voter Registration
          </span>
        </h1>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <div className="grid gap-8">
            {/* MetaMask Connection */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Wallet className="text-purple-400" />
                Connect Your Wallet
              </h2>
              <p className="text-gray-400">
                Connect your MetaMask wallet to get started with the registration process.
              </p>
              {isConnected && address && (
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-gray-300">Connected:</span>
                  <span className="text-purple-400 font-mono">{formatAddress(address)}</span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:text-purple-400 transition-colors"
                    title="Copy address"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )}
              {isWrongNetwork ? (
                <button 
                  onClick={handleSwitchNetwork}
                  disabled={isSwitching}
                  className={`
                    px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg 
                    hover:opacity-90 transition-all flex items-center gap-2 relative
                    ${isSwitching ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                    alt="MetaMask" 
                    className="w-6 h-6" 
                  />
                  {isSwitching ? (
                    <span className="flex items-center gap-2">
                      Switching to Sepolia...
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : (
                    'Switch to Sepolia Network'
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleConnect}
                  disabled={isConnecting || isSwitching}
                  className={`
                    px-6 py-3 bg-gradient-to-r 
                    ${isConnected ? 'from-red-600 to-red-700' : 'from-purple-600 to-blue-600'}
                    rounded-lg hover:opacity-90 transition-all flex items-center gap-2 relative
                    ${(isConnecting || isSwitching) ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                    alt="MetaMask" 
                    className="w-6 h-6" 
                  />
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      Connecting...
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : isConnected ? (
                    <span>
                      Disconnect Wallet
                    </span>
                  ) : (
                    'Connect MetaMask'
                  )}
              </button>
              )}
              {(error || connectError) && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  {(error instanceof Error ? error.message : 'An error occurred') || 
                   (connectError instanceof Error ? connectError.message : 'Connection error occurred')}
                </div>
              )}
              {isWrongNetwork && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400">
                  Please switch to the Sepolia test network to continue.
                </div>
              )}
            </div>

            {/* Identity Verification */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="text-purple-400" />
                Identity Verification
              </h2>
              <p className="text-gray-400">
                Verify your identity using your Aadhaar card. Choose your preferred verification method.
              </p>
              
              {isVerified ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                  <CheckCircle className="text-green-400" />
                  <span className="text-green-400">Identity verified successfully!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Verification Method Selection */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setVerificationMethod('upload')}
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        verificationMethod === 'upload'
                          ? 'border-purple-400/50 bg-purple-400/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-purple-400 mb-2" />
                      <div className="font-semibold">Upload Aadhaar Card</div>
                      <p className="text-sm text-gray-400">Upload an image of your Aadhaar card</p>
                    </button>
                    <button
                      onClick={() => setVerificationMethod('manual')}
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        verificationMethod === 'manual'
                          ? 'border-purple-400/50 bg-purple-400/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Shield className="w-5 h-5 text-purple-400 mb-2" />
                      <div className="font-semibold">Enter Aadhaar Number</div>
                      <p className="text-sm text-gray-400">Manually enter your 12-digit Aadhaar number</p>
                    </button>
                  </div>

                  {/* Verification Input */}
                  {verificationMethod === 'upload' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <label 
                          className={`
                            flex-1 px-6 py-4 border-2 border-dashed border-white/20 rounded-lg
                            hover:border-purple-400/50 transition-colors cursor-pointer
                            ${selectedFile ? 'border-purple-400/50 bg-purple-400/5' : ''}
                          `}
                        >
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileSelect}
                            disabled={!isConnected || isLoading || isExtracting}
                          />
                          <div className="flex items-center justify-center gap-2">
                            <Upload className="text-purple-400" />
                            <span className="text-gray-400">
                              {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
                            </span>
                          </div>
                        </label>
                        {selectedFile && (
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setExtractedAadhaar('');
                            }}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <XCircle />
                          </button>
                        )}
                      </div>

                      {isExtracting && (
                        <div className="flex items-center justify-center gap-2 p-4 bg-purple-400/5 rounded-lg">
                          <div className="w-5 h-5 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                          <span className="text-purple-400">Extracting Aadhaar number...</span>
                        </div>
                      )}

                      {extractedAadhaar && (
                        <div className="p-4 bg-purple-400/5 border border-purple-400/20 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-400">Extracted Aadhaar Number:</span>
                            <button
                              onClick={() => setExtractedAadhaar('')}
                              className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                          <input
                            type="text"
                            value={extractedAadhaar}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 12) {
                                setExtractedAadhaar(value);
                              }
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-400/50 transition-colors text-white font-mono"
                            pattern="\d{12}"
                            inputMode="numeric"
                            maxLength={12}
                          />
                          <p className="text-xs text-gray-400">
                            Please verify the extracted number before proceeding. You can edit it if needed.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter 12-digit Aadhaar number"
                        value={aadhaarNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 12) {
                            setAadhaarNumber(value);
                          }
                        }}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-400/50 transition-colors text-white"
                        pattern="\d{12}"
                        inputMode="numeric"
                        maxLength={12}
                        disabled={!isConnected || isLoading}
                      />
                      <p className="text-sm text-gray-400">
                        {aadhaarNumber.length}/12 digits entered
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleVerification}
                    disabled={
                      !isConnected || 
                      isLoading || 
                      isExtracting ||
                      (verificationMethod === 'upload' ? !extractedAadhaar || extractedAadhaar.length !== 12 : !aadhaarNumber || aadhaarNumber.length !== 12)
                    }
                    className={`
                      w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg
                      hover:opacity-90 transition-all flex items-center justify-center gap-2
                      ${(!isConnected || isLoading || isExtracting || (verificationMethod === 'upload' ? !extractedAadhaar || extractedAadhaar.length !== 12 : !aadhaarNumber || aadhaarNumber.length !== 12)) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isLoading ? (
                      <>
                        <span>Verifying...</span>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {verificationError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  {verificationError.message}
                </div>
              )}
            </div>

            {/* Verification Status - Only visible after verification */}
            {isVerified && verificationDetails && isConnected && address && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <FileSearch className="text-purple-400" />
                  Verification Status
                </h2>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400 flex items-center gap-2">
                      <CheckCircle size={16} />
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Verification Date:</span>
                    <span className="text-white">{formatTimestamp(verificationDetails.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Wallet Address:</span>
                    <span className="text-purple-400 font-mono">{formatAddress(address)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Aadhaar Status:</span>
                    <span className="text-white flex items-center gap-2">
                      <Shield size={16} className="text-purple-400" />
                      Verified & Encrypted
                    </span>
                  </div>
                  <div className="mt-4 p-4 bg-purple-400/5 border border-purple-400/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">Your Aadhaar Details:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-400">
                          {showDecrypted ? 'Decrypted' : 'Encrypted & Secure'}
                        </span>
                        <button
                          onClick={handleToggleDecryption}
                          className="p-1 hover:text-purple-400 transition-colors"
                          title={showDecrypted ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                        >
                          {showDecrypted ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="font-mono text-sm break-all text-white/80 bg-black/20 p-3 rounded border border-white/10">
                      {showDecrypted ? (
                        <div className="flex items-center justify-between">
                          <span>{decryptedAadhaar}</span>
                          <button
                            onClick={() => {
                              if (decryptedAadhaar) {
                                navigator.clipboard.writeText(decryptedAadhaar);
                              }
                            }}
                            className="p-1 hover:text-purple-400 transition-colors"
                            title="Copy Aadhaar number"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      ) : (
                        verificationDetails.encryptedAadhaar
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {showDecrypted 
                        ? 'This is your actual Aadhaar number. Please keep it confidential.'
                        : 'This is your encrypted Aadhaar data. Click the eye icon to view your actual number.'}
                    </p>
                    {showDecrypted && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs flex items-center gap-2">
                        <Shield size={14} />
                        For security, the decrypted number will be hidden when you leave this page
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface VerificationStepProps {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "pending" | "completed" | "locked";
}

const VerificationStep = ({ icon: Icon, title, description, status }: VerificationStepProps) => (
  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-purple-900/50 rounded-lg">
        <Icon className="w-6 h-6 text-purple-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-lg font-semibold mb-1">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {status === "pending" && (
        <span className="px-3 py-1 rounded-full text-sm bg-yellow-900/50 text-yellow-400">
          Pending
        </span>
        )}
        {status === "completed" && (
          <span className="px-3 py-1 rounded-full text-sm bg-green-900/50 text-green-400">
            Completed
          </span>
        )}
        {status === "locked" && (
          <span className="px-3 py-1 rounded-full text-sm bg-gray-900/50 text-gray-400">
            Locked
          </span>
        )}
      </div>
    </div>
  </div>
);

export default Registration;