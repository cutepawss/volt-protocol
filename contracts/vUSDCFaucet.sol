// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./vUSDC.sol";

/**
 * @title vUSDC Faucet (Secure Version)
 * @notice Faucet contract for distributing vUSDC test tokens
 * @dev Users can request 1000 vUSDC once every 24 hours
 * @author VoltProtocol Team
 */
contract vUSDCFaucet is Ownable, ReentrancyGuard {
    vUSDC public immutable token;
    
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 vUSDC per request
    uint256 public constant COOLDOWN_PERIOD = 24 hours; // 24 hour cooldown
    
    bool public paused;
    
    mapping(address => uint256) public lastRequestTime;
    mapping(address => bool) public isBlacklisted;
    
    event TokensRequested(address indexed user, uint256 amount, uint256 timestamp);
    event TokensDeposited(address indexed depositor, uint256 amount);
    event BlacklistUpdated(address indexed user, bool isBlacklisted);
    event PausedUpdated(bool isPaused);
    
    /**
     * @param _token Address of the vUSDC token contract
     * @param initialOwner Owner of the faucet contract
     */
    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        require(_token != address(0), "Invalid token address");
        token = vUSDC(_token);
    }
    
    /**
     * @notice Request tokens from faucet
     * @dev Can only request once per 24 hours per address
     */
    function requestTokens() external nonReentrant {
        require(!paused, "Faucet is paused");
        require(!isBlacklisted[msg.sender], "Address is blacklisted");
        require(
            block.timestamp >= lastRequestTime[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown period not expired"
        );
        require(
            token.balanceOf(address(this)) >= FAUCET_AMOUNT,
            "Faucet empty, please try later"
        );
        
        // Update state BEFORE transfer (Checks-Effects-Interactions pattern)
        lastRequestTime[msg.sender] = block.timestamp;
        
        // Transfer tokens
        require(
            token.transfer(msg.sender, FAUCET_AMOUNT),
            "Token transfer failed"
        );
        
        emit TokensRequested(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
    
    /**
     * @notice Check if user can request tokens
     * @param user Address to check
     * @return canRequestTokens True if user can request tokens
     * @return timeUntilNextRequest Time until next request is available (in seconds)
     */
    function canRequest(address user) external view returns (bool canRequestTokens, uint256 timeUntilNextRequest) {
        if (paused) {
            return (false, 0);
        }
        
        if (isBlacklisted[user]) {
            return (false, 0);
        }
        
        if (token.balanceOf(address(this)) < FAUCET_AMOUNT) {
            return (false, 0);
        }
        
        uint256 lastRequest = lastRequestTime[user];
        uint256 nextRequestTime = lastRequest + COOLDOWN_PERIOD;
        
        if (block.timestamp >= nextRequestTime) {
            return (true, 0);
        }
        
        return (false, nextRequestTime - block.timestamp);
    }
    
    /**
     * @notice Get time until next request for a user
     * @param user Address to check
     * @return Time in seconds until next request
     */
    function getTimeUntilNextRequest(address user) external view returns (uint256) {
        if (isBlacklisted[user]) {
            return type(uint256).max;
        }
        
        uint256 lastRequest = lastRequestTime[user];
        uint256 nextRequestTime = lastRequest + COOLDOWN_PERIOD;
        
        if (block.timestamp >= nextRequestTime) {
            return 0;
        }
        
        return nextRequestTime - block.timestamp;
    }
    
    /**
     * @notice Pause/unpause the faucet
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedUpdated(_paused);
    }
    
    /**
     * @notice Blacklist/unblacklist an address
     * @param user Address to blacklist/unblacklist
     * @param blacklisted True to blacklist, false to unblacklist
     */
    function setBlacklist(address user, bool blacklisted) external onlyOwner {
        require(user != address(0), "Cannot blacklist zero address");
        isBlacklisted[user] = blacklisted;
        emit BlacklistUpdated(user, blacklisted);
    }
    
    /**
     * @notice Blacklist multiple addresses at once
     * @param users Array of addresses to blacklist/unblacklist
     * @param blacklisted True to blacklist, false to unblacklist
     */
    function setBlacklistBatch(address[] calldata users, bool blacklisted) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Cannot blacklist zero address");
            isBlacklisted[users[i]] = blacklisted;
            emit BlacklistUpdated(users[i], blacklisted);
        }
    }
    
    /**
     * @notice Withdraw tokens from faucet (emergency only)
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        require(token.transfer(owner(), amount), "Token transfer failed");
    }
    
    /**
     * @notice Deposit tokens to faucet
     * @param amount Amount to deposit
     */
    function depositTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Insufficient allowance"
        );
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        emit TokensDeposited(msg.sender, amount);
    }
    
    /**
     * @notice Get faucet balance
     * @return Balance of tokens in faucet
     */
    function getFaucetBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @notice Reset cooldown for a user (owner only, for testing/emergency)
     * @param user Address to reset cooldown for
     */
    function resetCooldown(address user) external onlyOwner {
        lastRequestTime[user] = 0;
    }
    
    /**
     * @notice Reset cooldown for multiple users (owner only, for testing/emergency)
     * @param users Array of addresses to reset cooldown for
     */
    function resetCooldowns(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            lastRequestTime[users[i]] = 0;
        }
    }
}