import React from 'react';
import styles from './ApprovalModal.module.css';

/**
 * ApprovalModal Component
 * 
 * Shows a warning/explanation before ERC20 token approval
 * to prevent user confusion when MetaMask shows "NFT withdrawal"
 */

const ApprovalModal = ({ isOpen, onConfirm, onCancel, tokenSymbol, amount, spender }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Token Approval Required</h3>
          <button className={styles.closeButton} onClick={onCancel}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.warningBox}>
            <p>
              <strong>⚠️ Important:</strong> You are about to approve a token transfer.
            </p>
            <p>
              MetaMask may incorrectly show this as "NFT withdrawal permission", 
              but this is actually a <strong>standard ERC20 token approval</strong>.
            </p>
          </div>
          
          <div className={styles.detailsBox}>
            <h4>Transaction Details:</h4>
            <div className={styles.detailRow}>
              <span className={styles.label}>Token:</span>
              <span className={styles.value}>{tokenSymbol} (ERC20)</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Amount:</span>
              <span className={styles.value}>{amount}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Spender:</span>
              <span className={styles.value}>{spender?.slice(0, 10)}...{spender?.slice(-8)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Purpose:</span>
              <span className={styles.value}>Allow contract to transfer tokens for stream creation</span>
            </div>
          </div>
          
          <div className={styles.infoBox}>
            <p>
              <strong>What you're approving:</strong> You are giving the VoltProtocol contract 
              permission to transfer {tokenSymbol} tokens from your wallet to create a payment stream. 
              This is a standard DeFi operation and is safe.
            </p>
            <p>
              <strong>If MetaMask shows "NFT withdrawal":</strong> This is a MetaMask display bug. 
              Click "Approve" - the transaction is safe and correct.
            </p>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

