import React, { useState, useMemo } from 'react';
import { useVolt } from '../../context/VoltContext';
import { useLiveStreamPrice } from '../../hooks/useLiveStreamPrice';
import { useStreamNotes } from '../../hooks/useStreamNotes';
import StreamDetailModal from './StreamDetailModal';
import styles from './StreamCard.module.css';

/**
 * StreamCard Component - FIXED VERSION
 * 
 * Uses stream.claimedAmount instead of stream.flowedAmount
 */

const StreamCard = ({ stream, type = 'incoming' }) => {
  const [showModal, setShowModal] = useState(false);
  const { note } = useStreamNotes(stream.id);
  const { withdrawFromStream, toast } = useVolt();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Calculate real-time price
  const { remainingBalance, timeRemaining, formattedBalance } = 
    useLiveStreamPrice(stream, 0, true);

  // Calculate claimable amount

const [claimableAmount, setClaimableAmount] = useState(0);

React.useEffect(() => {
  const updateClaimable = () => {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, now - stream.startTime);
    const cappedElapsed = Math.min(elapsed, stream.duration);
    
    const totalFlowed = stream.duration > 0 
      ? (stream.totalDeposit * cappedElapsed) / stream.duration 
      : 0;
    
    const alreadyClaimed = stream.claimedAmount || 0;
    const soldAmount = stream.soldAmount || 0;
    const available = totalFlowed - alreadyClaimed - soldAmount;
    
    setClaimableAmount(Math.max(0, available));
  };

  updateClaimable();
  const interval = setInterval(updateClaimable, 1000);
  return () => clearInterval(interval);
}, [stream]);

  // Calculate progress
  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - stream.startTime);
  const progress = stream.duration > 0 ? (elapsed / stream.duration) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, progress));

  const handleQuickWithdraw = async (e) => {
    e.stopPropagation();
    
    if (claimableAmount <= 0) {
      toast.error('No funds available to withdraw');
      return;
    }

    setIsWithdrawing(true);
    
    try {
      await withdrawFromStream(stream.id, claimableAmount);
      toast.success(`Withdrawn ${claimableAmount.toFixed(6)} vUSDC`);
    } catch (error) {
      console.error('Quick withdraw error:', error);
      toast.error(error.message || 'Failed to withdraw');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Only show withdraw option if claimable amount is significant
  const showWithdrawOption = type === 'incoming' && claimableAmount > 0.000001;

  return (
    <>
      <div className={styles.streamCard}>
        <div 
          className={styles.cardHeader} 
          onClick={() => setShowModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.cardTitle}>
            <span className={styles.streamId}>Stream #{stream.id}</span>
            <span className={styles.streamType}>{type === 'incoming' ? 'Incoming' : 'Outgoing'}</span>
          </div>
          <div className={styles.clickHint}>Click for details</div>
        </div>

        <div className={styles.cardBody}>
          {/* Main Stats */}
          <div className={styles.mainStats}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Remaining Balance</div>
              <div className={styles.statValue}>
                {formattedBalance} vUSDC
              </div>
              <div className={styles.statSubtext}>Updates every second</div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statLabel}>Progress</div>
              <div className={styles.statValue}>
                {progressPercent.toFixed(2)}%
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Claimable Amount for Incoming Streams */}
            {showWithdrawOption && (
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Available to Withdraw</div>
                <div className={styles.statValue} style={{ color: 'var(--success)' }}>
                  {claimableAmount.toFixed(6)} vUSDC
                </div>
                <button
                  className={styles.quickWithdrawBtn}
                  onClick={handleQuickWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            )}

            {/* Note Preview */}
            {note && (
              <div className={styles.notePreview}>
                <div className={styles.notePreviewLabel}>Note:</div>
                <div className={styles.notePreviewText}>
                  {note.length > 60 ? `${note.substring(0, 60)}...` : note}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <StreamDetailModal
          stream={stream}
          type={type}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default StreamCard;