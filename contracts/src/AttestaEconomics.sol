// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AttestaEconomics
 * @dev Sidecar contract for publisher staking and validator rewards
 * @notice Handles economics without touching core EvidenceRegistry
 */
contract AttestaEconomics is Ownable, ReentrancyGuard {
    
    struct CIDEconomics {
        address publisher;
        uint256 insurancePool;        // 85% - slashable funds
        uint256 rewardPool;           // 15% - pays monitoring rewards  
        uint256 consecutiveBreaches;
        uint256 lastBreachAt;
    }
    
    mapping(bytes32 => CIDEconomics) public cidEconomics;
    mapping(address => uint256) public validatorRewards;
    
    // Global parameters (demo-friendly & sustainable)
    uint256 public platformFeeBps = 250;           // 2.5%
    uint256 public rewardPoolBps = 1500;           // 15%
    uint256 public insurancePoolBps = 8500;        // 85%
    uint256 public okRewardWei = 1e11;             // 0.0000001 ETH per OK cycle
    uint256 public payoutBps = 5000;               // 50% of insurance on breach
    uint256 public breachThreshold = 3;            // 3 consecutive breaches
    uint256 public withdrawCooldownSec = 600;      // 10 minutes
    
    address public treasury;
    address public validatorBeneficiary;           // Attesta for now
    address public policyRole;                     // Can record cycles
    
    // Events
    event PublisherStaked(bytes32 indexed cid, address indexed publisher, uint256 total, uint256 insurance, uint256 rewards);
    event MonitoringRewardPaid(bytes32 indexed cid, address indexed validator, uint256 amount);
    event BreachRecorded(bytes32 indexed cid, uint256 consecutiveCount);
    event InsurancePayout(bytes32 indexed cid, address indexed beneficiary, uint256 amount);
    event RewardsClaimed(address indexed validator, uint256 amount);
    event ParametersUpdated(uint256 okRewardWei, uint256 payoutBps, uint256 breachThreshold, uint256 withdrawCooldownSec);
    event AddressesUpdated(address treasury, address validatorBeneficiary, address policyRole);
    
    constructor(address _treasury, address _validatorBeneficiary, address _policyRole) Ownable(msg.sender) {
        treasury = _treasury;
        validatorBeneficiary = _validatorBeneficiary;
        policyRole = _policyRole;
    }
    
    modifier onlyPolicy() {
        require(msg.sender == policyRole, "Only policy role");
        _;
    }
    
    /**
     * @notice Fund publisher stake for a CID
     * @param cid The CID to fund stake for
     */
    function fundPublisherStake(bytes32 cid) external payable {
        require(msg.value > 0, "Must send ETH");
        require(cidEconomics[cid].publisher == address(0), "CID already funded");
        
        // Calculate splits
        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        uint256 remaining = msg.value - platformFee;
        uint256 rewardAmount = (remaining * rewardPoolBps) / 10000;
        uint256 insuranceAmount = remaining - rewardAmount;
        
        // Store economics
        cidEconomics[cid] = CIDEconomics({
            publisher: msg.sender,
            insurancePool: insuranceAmount,
            rewardPool: rewardAmount,
            consecutiveBreaches: 0,
            lastBreachAt: 0
        });
        
        // Transfer platform fee to treasury
        if (platformFee > 0) {
            (bool success, ) = treasury.call{value: platformFee}("");
            require(success, "Treasury transfer failed");
        }
        
        emit PublisherStaked(cid, msg.sender, msg.value, insuranceAmount, rewardAmount);
    }
    
    /**
     * @notice Record monitoring cycle result
     * @param cid The CID being monitored
     * @param status 0 = OK, 1+ = BREACH
     */
    function recordCycle(bytes32 cid, uint8 status) external onlyPolicy {
        CIDEconomics storage economics = cidEconomics[cid];
        require(economics.publisher != address(0), "CID not funded");
        
        if (status == 0) { // OK status
            // Pay monitoring reward if pool has funds
            if (economics.rewardPool >= okRewardWei) {
                economics.rewardPool -= okRewardWei;
                validatorRewards[validatorBeneficiary] += okRewardWei;
                economics.consecutiveBreaches = 0; // Reset on OK
                
                emit MonitoringRewardPaid(cid, validatorBeneficiary, okRewardWei);
            }
        } else { // BREACH status
            economics.consecutiveBreaches++;
            economics.lastBreachAt = block.timestamp;
            
            emit BreachRecorded(cid, economics.consecutiveBreaches);
        }
    }
    
    /**
     * @notice Trigger insurance payout after breach threshold
     * @param cid The CID to pay out for
     */
    function payoutOnBreach(bytes32 cid) external onlyPolicy {
        CIDEconomics storage economics = cidEconomics[cid];
        require(economics.consecutiveBreaches >= breachThreshold, "Breach threshold not met");
        require(economics.insurancePool > 0, "No insurance funds");
        
        // Calculate payout (50% of insurance pool)
        uint256 slashAmount = (economics.insurancePool * payoutBps) / 10000;
        
        // Split: 60% to validator, 40% to treasury
        uint256 validatorShare = (slashAmount * 6000) / 10000;
        uint256 treasuryShare = slashAmount - validatorShare;
        
        // Update pool
        economics.insurancePool -= slashAmount;
        economics.consecutiveBreaches = 0;
        
        // Credit validator rewards
        validatorRewards[validatorBeneficiary] += validatorShare;
        
        // Send to treasury immediately
        if (treasuryShare > 0) {
            (bool success, ) = treasury.call{value: treasuryShare}("");
            require(success, "Treasury transfer failed");
        }
        
        emit InsurancePayout(cid, validatorBeneficiary, slashAmount);
    }
    
    /**
     * @notice Claim accumulated validator rewards
     */
    function claimRewards() external nonReentrant {
        uint256 amount = validatorRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        validatorRewards[msg.sender] = 0;
        
        // Use .call for safety
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit RewardsClaimed(msg.sender, amount);
    }
    
    /**
     * @notice Publisher withdraws stake (with restrictions)
     * @param cid The CID to withdraw from
     * @param amount Amount to withdraw
     */
    function withdrawPublisherStake(bytes32 cid, uint256 amount) external nonReentrant {
        CIDEconomics storage economics = cidEconomics[cid];
        require(msg.sender == economics.publisher, "Only publisher");
        require(economics.consecutiveBreaches == 0, "Cannot withdraw during breach");
        require(block.timestamp >= economics.lastBreachAt + withdrawCooldownSec, "Cooldown period");
        
        // Withdraw from reward pool first, then insurance (with minimum)
        uint256 availableRewards = economics.rewardPool;
        uint256 minInsurance = 1e16; // Keep 0.01 ETH minimum
        uint256 availableInsurance = economics.insurancePool > minInsurance ? 
            economics.insurancePool - minInsurance : 0;
        uint256 totalAvailable = availableRewards + availableInsurance;
        
        require(amount <= totalAvailable, "Insufficient funds");
        
        if (amount <= availableRewards) {
            economics.rewardPool -= amount;
        } else {
            uint256 fromInsurance = amount - availableRewards;
            economics.rewardPool = 0;
            economics.insurancePool -= fromInsurance;
        }
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Get CID economics details
     */
    function getCIDEconomics(bytes32 cid) external view returns (
        address publisher,
        uint256 insurancePool,
        uint256 rewardPool,
        uint256 consecutiveBreaches,
        uint256 lastBreachAt
    ) {
        CIDEconomics memory economics = cidEconomics[cid];
        return (
            economics.publisher,
            economics.insurancePool,
            economics.rewardPool,
            economics.consecutiveBreaches,
            economics.lastBreachAt
        );
    }
    
    /**
     * @notice Check if CID is funded
     */
    function isCIDFunded(bytes32 cid) external view returns (bool) {
        return cidEconomics[cid].publisher != address(0);
    }
    
    /**
     * @notice Get expected split for deposit amount
     */
    function getDepositSplit(uint256 depositAmount) external view returns (
        uint256 platformFee,
        uint256 insurancePool,
        uint256 rewardPool
    ) {
        platformFee = (depositAmount * platformFeeBps) / 10000;
        uint256 remaining = depositAmount - platformFee;
        rewardPool = (remaining * rewardPoolBps) / 10000;
        insurancePool = remaining - rewardPool;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Update economic parameters
     */
    function updateParameters(
        uint256 _okRewardWei,
        uint256 _payoutBps, 
        uint256 _breachThreshold,
        uint256 _withdrawCooldownSec
    ) external onlyOwner {
        require(_payoutBps <= 10000, "Invalid payout basis points");
        require(_breachThreshold > 0, "Invalid breach threshold");
        
        okRewardWei = _okRewardWei;
        payoutBps = _payoutBps;
        breachThreshold = _breachThreshold;
        withdrawCooldownSec = _withdrawCooldownSec;
        
        emit ParametersUpdated(_okRewardWei, _payoutBps, _breachThreshold, _withdrawCooldownSec);
    }
    
    /**
     * @notice Update contract addresses
     */
    function updateAddresses(
        address _treasury,
        address _validatorBeneficiary,
        address _policyRole
    ) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        require(_validatorBeneficiary != address(0), "Invalid validator");
        require(_policyRole != address(0), "Invalid policy role");
        
        treasury = _treasury;
        validatorBeneficiary = _validatorBeneficiary;
        policyRole = _policyRole;
        
        emit AddressesUpdated(_treasury, _validatorBeneficiary, _policyRole);
    }
    
    /**
     * @notice Emergency function to recover stuck funds (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Emergency withdraw failed");
    }
    
    // ========== RECEIVE ==========
    
    receive() external payable {
        revert("Use fundPublisherStake function");
    }
}
