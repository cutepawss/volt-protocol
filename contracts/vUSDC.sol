// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title vUSDC - Volt USDC Token (Secure Version)
 * @notice ERC20 token for Volt Protocol on Arc Network
 * @dev Initial supply: 10,000,000,000 vUSDC (10 billion)
 * @dev Max supply: 100,000,000,000 vUSDC (100 billion)
 * @author VoltProtocol Team
 */
contract vUSDC is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10**18; // 10 billion tokens
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18; // 100 billion tokens max
    
    mapping(address => bool) public isBlacklisted;
    
    event Blacklisted(address indexed account, bool isBlacklisted);
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor(address initialOwner) 
        ERC20("Volt USDC", "vUSDC") 
        Ownable(initialOwner) 
    {
        // Mint initial supply to contract deployer
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in wei, 18 decimals)
     * @dev Cannot exceed MAX_SUPPLY
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Exceeds maximum supply"
        );
        
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn tokens from your own balance
     * @param amount Amount to burn
     * @dev Anyone can burn their own tokens
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from another address (requires approval)
     * @param account Address to burn from
     * @param amount Amount to burn
     * @dev Requires allowance from account
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit Burned(account, amount);
    }

    /**
     * @notice Pause all token transfers (emergency only)
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Blacklist/unblacklist an address
     * @param account Address to blacklist
     * @param blacklisted True to blacklist, false to unblacklist
     * @dev Blacklisted addresses cannot send or receive tokens
     */
    function setBlacklist(address account, bool blacklisted) external onlyOwner {
        require(account != address(0), "Cannot blacklist zero address");
        isBlacklisted[account] = blacklisted;
        emit Blacklisted(account, blacklisted);
    }

    /**
     * @notice Blacklist multiple addresses
     * @param accounts Array of addresses to blacklist
     * @param blacklisted True to blacklist, false to unblacklist
     */
    function setBlacklistBatch(address[] calldata accounts, bool blacklisted) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Cannot blacklist zero address");
            isBlacklisted[accounts[i]] = blacklisted;
            emit Blacklisted(accounts[i], blacklisted);
        }
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * @notice Checks pause status and blacklist
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        require(!isBlacklisted[from], "Sender is blacklisted");
        require(!isBlacklisted[to], "Recipient is blacklisted");
        
        super._update(from, to, amount);
    }
}