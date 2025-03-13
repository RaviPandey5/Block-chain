// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Election {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string description;
        uint256 voteCount;
    }

    address public owner;
    mapping(address => bool) public admins;
    mapping(address => bool) public hasVoted;
    Candidate[] public candidates;
    uint256 public candidateCount;

    event CandidateAdded(uint256 indexed id, string name, string party);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        candidateCount = 0;
    }

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

    function vote(uint256 _candidateId) external {
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        
        hasVoted[msg.sender] = true;
        candidates[_candidateId - 1].voteCount++;
        
        emit VoteCast(msg.sender, _candidateId);
    }

    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function isAdmin(address _user) external view returns (bool) {
        return admins[_user] || _user == owner;
    }
} 