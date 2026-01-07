import React, { useState, useMemo } from 'react';
import { useVolt } from '../../context/VoltContext';
import { useLiveStreamPrice } from '../../hooks/useLiveStreamPrice';
import { useStreamNotes } from '../../hooks/useStreamNotes';
import styles from './StreamDetailModal.module.css';

const StreamDetailModal = ({ stream, type, onClose }) => {
  if (!stream) return null;

  const { withdrawFromStream, toast, activeStreams } = useVolt();
  const { note, isEditing, setIsEditing, saveNote, deleteNote } = useStreamNotes(stream.id);
  const [tempNote, setTempNote] = useState(note);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // ✅ activeStreams'den güncel stream'i bul
  const currentStream = useMemo(() => 
    activeStreams.find(s => s.id === stream.id) || stream,
    [activeStreams, stream.id, stream]
  );

  const { remainingBalance, timeRemaining, formattedBalance } = 
    useLiveStreamPrice(currentStream, 0, true);

  const [claimableAmount, setClaimableAmount] = useState(0);

React.useEffect(() => {
  const updateClaimable = () => {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, now - currentStream.startTime);
    const cappedElapsed = Math.min(elapsed, currentStream.duration);
    
    const totalFlowed = currentStream.duration > 0 
      ? (currentStream.totalDeposit * cappedElapsed) / currentStream.duration 
      : 0;
    
    const alreadyClaimed = currentStream.claimedAmount || 0;
    const soldAmount = currentStream.soldAmount || 0;
    const available = totalFlowed - alreadyClaimed - soldAmount;

    console.log('🔄 Claimable update:', { 
      totalFlowed: totalFlowed.toFixed(6),
      alreadyClaimed: alreadyClaimed.toFixed(6),
      available: available.toFixed(6)
    });
    
    setClaimableAmount(Math.max(0, available));
  };

  updateClaimable();
  const interval = setInterval(updateClaimable, 1000);

  return () => clearInterval(interval);
}, [currentStream]);

  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - currentStream.startTime);
  const progress = currentStream.duration > 0 ? (elapsed / currentStream.duration) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, progress));

  const daysRemaining = Math.floor(timeRemaining / (60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (60 * 60)) / 60);
  const secondsRemaining = Math.floor(timeRemaining % 60);

  const ratePerSecond = currentStream.duration > 0 ? currentStream.totalDeposit / currentStream.duration : 0;
  const ratePerDay = ratePerSecond * 60 * 60 * 24;
  const ratePerMonth = ratePerDay * 30;

  const startDate = new Date(currentStream.startTime * 1000);
  const endDate = new Date((currentStream.startTime + currentStream.duration) * 1000);

  const address = type === 'incoming' ? currentStream.sender : currentStream.receiver;
  const addressLabel = type === 'incoming' ? 'From' : 'To';

  const handleSaveNote = () => {
    saveNote(tempNote);
  };

  const handleCancelEdit = () => {
    setTempNote(note);
    setIsEditing(false);
  };

  const handleWithdraw = async () => {
  if (claimableAmount <= 0) {
    toast.error('No funds available to withdraw');
    return;
  }

  setIsWithdrawing(true);
  
  try {
    await withdrawFromStream(stream.id, claimableAmount); 
    toast.success(`Withdrawn ${claimableAmount.toFixed(6)} vUSDC`);
    
    setTimeout(() => {
      onClose();
    }, 3000);
    
  } catch (error) {
    console.error('Withdraw error:', error);
    toast.error(error.message || 'Failed to withdraw from stream');
  } finally {
    setIsWithdrawing(false);
  }
};

  const handleMaxWithdraw = () => {
    setWithdrawAmount(claimableAmount.toFixed(6));
  };

  React.useEffect(() => {
    setTempNote(note);
  }, [note]);

  const showWithdrawSection = type === 'incoming' && claimableAmount > 0.000001;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Stream Details</h2>
          <div className={styles.streamId}>Stream #{currentStream.id}</div>
        </div>

        <div className={styles.modalBody}>
          {showWithdrawSection && (
  <div className={styles.withdrawSection}>
    <div className={styles.withdrawHeader}>
      <h3 className={styles.withdrawTitle}>Withdraw Funds</h3>
      <div className={styles.withdrawAvailable}>
        Available: <strong>{(claimableAmount || 0).toFixed(6)} vUSDC</strong>
      </div>
    </div>
    
    <button
      className={styles.withdrawBtn}
      onClick={handleWithdraw}
      disabled={isWithdrawing}
      type="button"
    >
      {isWithdrawing ? 'Processing...' : 'Withdraw'}
    </button>
    
    <p className={styles.withdrawHint}>
      Withdraws all available funds from this stream
    </p>
  </div>
)}

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Deposit</div>
              <div className={styles.statValue}>
                {(currentStream.totalDeposit || 0).toFixed(6)} vUSDC
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Remaining Balance</div>
              <div className={styles.statValue} style={{ color: 'var(--accent)' }}>
                {formattedBalance} vUSDC
              </div>
              <div className={styles.statSubtext}>Updates every second</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Claimed Amount</div>
              <div className={styles.statValue} style={{ color: 'var(--success)' }}>
                {(currentStream.claimedAmount || 0).toFixed(6)} vUSDC
              </div>
            </div>

            <div className={styles.statCard}>
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
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Stream Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Type</span>
                <span className={styles.infoValue}>{type === 'incoming' ? 'Incoming' : 'Outgoing'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{addressLabel} Address</span>
                <span className={styles.infoValue} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                  {address}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Start Date</span>
                <span className={styles.infoValue}>
                  {startDate.toLocaleString()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>End Date</span>
                <span className={styles.infoValue}>
                  {endDate.toLocaleString()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Duration</span>
                <span className={styles.infoValue}>
                  {Math.floor(currentStream.duration / (60 * 60 * 24))} days
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Time Remaining</span>
                <span className={styles.infoValue}>
                  {daysRemaining > 0 && `${daysRemaining}d `}
                  {hoursRemaining > 0 && `${hoursRemaining}h `}
                  {minutesRemaining > 0 && `${minutesRemaining}m `}
                  {secondsRemaining}s
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Stream Rates</h3>
            <div className={styles.ratesGrid}>
              <div className={styles.rateCard}>
                <div className={styles.rateLabel}>Per Second</div>
                <div className={styles.rateValue}>
                  {ratePerSecond.toFixed(9)} vUSDC/s
                </div>
              </div>
              <div className={styles.rateCard}>
                <div className={styles.rateLabel}>Per Day</div>
                <div className={styles.rateValue}>
                  {ratePerDay.toFixed(6)} vUSDC/day
                </div>
              </div>
              <div className={styles.rateCard}>
                <div className={styles.rateLabel}>Per Month</div>
                <div className={styles.rateValue}>
                  {ratePerMonth.toFixed(2)} vUSDC/month
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.notesHeader}>
              <h3 className={styles.sectionTitle}>Notes</h3>
              {!isEditing && (
                <div className={styles.notesActions}>
                  {note && (
                    <button
                      className={styles.noteButton}
                      onClick={deleteNote}
                      title="Delete note"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    className={styles.noteButton}
                    onClick={() => setIsEditing(true)}
                  >
                    {note ? 'Edit' : 'Add Note'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className={styles.notesEditor}>
                <textarea
                  className={styles.noteTextarea}
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Add a note for this stream..."
                  rows={4}
                  autoFocus
                />
                <div className={styles.notesEditorActions}>
                  <button
                    className={styles.noteButtonSecondary}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.noteButtonPrimary}
                    onClick={handleSaveNote}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.notesDisplay}>
                {note ? (
                  <p className={styles.noteText}>{note}</p>
                ) : (
                  <p className={styles.notePlaceholder}>No notes added yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamDetailModal;
