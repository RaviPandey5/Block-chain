// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string description;
        uint256 voteCount;
    }

    struct AadhaarVerification {
        bool isVerified;
        bytes32 encryptedAadhaar;
        uint256 timestamp;
    }

    address public owner;
    mapping(address => bool) public admins;
    mapping(address => bool) public hasVoted;
    mapping(address => AadhaarVerification) public verifications;
    mapping(bytes32 => bool) public usedAadhaar;
    Candidate[] public candidates;
    uint256 public candidateCount;

    event CandidateAdded(uint256 indexed id, string name, string party);
    event CandidateRemoved(uint256 indexed id, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event AadhaarVerified(address indexed user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can call this function");
        _;
    }

    modifier onlyVerified() {
        require(verifications[msg.sender].isVerified, "Aadhaar verification required");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        candidateCount = 0;
    }

    // Admin Management Functions
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(!admins[_admin], "Already an admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        require(admins[_admin], "Not an admin");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    // Aadhaar Verification Functions
    function verifyAadhaar(bytes32 _encryptedAadhaar) external {
        require(!verifications[msg.sender].isVerified, "Already verified");
        require(!usedAadhaar[_encryptedAadhaar], "Aadhaar already used");

        verifications[msg.sender] = AadhaarVerification({
            isVerified: true,
            encryptedAadhaar: _encryptedAadhaar,
            timestamp: block.timestamp
        });

        usedAadhaar[_encryptedAadhaar] = true;
        emit AadhaarVerified(msg.sender);
    }

    function isVerified(address user) external view returns (bool) {
        return verifications[user].isVerified;
    }

    function getVerificationDetails(address user) external view returns (AadhaarVerification memory) {
        return verifications[user];
    }

    // Candidate Management Functions
    function addCandidate(string memory _name, string memory _party, string memory _description) external onlyAdmin {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_party).length > 0, "Party cannot be empty");
        
        candidateCount++;
        candidates.push(Candidate({
            id: candidateCount,
            name: _name,
            party: _party,
            description: _description,
            voteCount: 0
        }));

        emit CandidateAdded(candidateCount, _name, _party);
    }

    function removeCandidate(uint256 _candidateId) external onlyAdmin {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        
        // Find the candidate index
        uint256 indexToRemove = _candidateId - 1;
        string memory removedName = candidates[indexToRemove].name;
        
        // Shift the array elements to remove the candidate
        for (uint i = indexToRemove; i < candidates.length - 1; i++) {
            candidates[i] = candidates[i + 1];
            candidates[i].id = i + 1; // Update IDs to maintain sequence
        }
        candidates.pop(); // Remove the last element
        candidateCount--;
        
        emit CandidateRemoved(_candidateId, removedName);
    }

    // Voting Functions
    function vote(uint256 _candidateId) external onlyVerified {
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        
        hasVoted[msg.sender] = true;
        candidates[_candidateId - 1].voteCount++;
        
        emit VoteCast(msg.sender, _candidateId);
    }

    // View Functions
    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function isAdmin(address _user) external view returns (bool) {
        return admins[_user] || _user == owner;
    }
} 