import React, { useState } from 'react';
import { useVolt } from '../../context/VoltContext';
import InfoBox from '../Shared/InfoBox';
import styles from './CreateStreamForm.module.css';

/**
 * CreateStreamForm Component
 * 
 * Allows users to create new streams
 */

const CreateStreamForm = () => {
  const { user, createStream, toast } = useVolt();
  const [receiverAddress, setReceiverAddress] = useState('');
  const [totalDeposit, setTotalDeposit] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!receiverAddress || !totalDeposit || !durationDays) {
      toast.error('Please fill in all fields');
      return;
    }

    // Basic address validation
    if (!receiverAddress.startsWith('0x') || receiverAddress.length !== 42) {
      toast.error('Invalid wallet address');
      return;
    }

    const depositNum = parseFloat(totalDeposit);
    const daysNum = parseInt(durationDays, 10);

    // Validate that values are numbers
    if (isNaN(depositNum) || isNaN(daysNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (depositNum <= 0) {
      toast.error('Deposit amount must be greater than 0');
      return;
    }

    if (daysNum <= 0 || daysNum > 365) {
      toast.error('Duration must be between 1 and 365 days');
      return;
    }

    if (user.balanceVUSDC < depositNum) {
      toast.error(`Insufficient vUSDC balance. You have ${user.balanceVUSDC.toFixed(2)} vUSDC, but need ${depositNum.toFixed(2)} vUSDC.`);
      return;
    }

    setLoading(true);
    
    try {
      const durationSeconds = daysNum * 24 * 60 * 60;
      const stream = await createStream(
        receiverAddress,
        depositNum,
        durationSeconds
      );
      
      toast.success(`Stream created successfully! ID: ${stream.id.slice(-8)}, Amount: ${depositNum} vUSDC, Duration: ${daysNum} days`);
      
      // Reset form
      setReceiverAddress('');
      setTotalDeposit('');
      setDurationDays('30');
    } catch (error) {
      console.error('Error creating stream:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const availableBalance = user.balanceVUSDC || 0;

  return (
    <div className={styles.createStreamForm}>
      {/* Info Box */}
      <InfoBox title="Create New Payment Stream" type="info">
        <p>
          Create a <strong>payment stream</strong> to send vUSDC continuously to a receiver over time. 
          The funds are locked in a smart contract and flow automatically per second.
        </p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li><strong>Lock Funds:</strong> Deposit vUSDC that will be streamed to the receiver.</li>
          <li><strong>Set Duration:</strong> Choose how long the stream should last (7-365 days).</li>
          <li><strong>Automatic Flow:</strong> Money flows per second automatically. The receiver can withdraw at any time.</li>
          <li><strong>Stream Management:</strong> View and manage your streams in the Dashboard.</li>
        </ul>
        <p>
          💡 <strong>Tip:</strong> The receiver can claim their earnings at any time. The stream continues until the duration ends or all funds are claimed.
        </p>
      </InfoBox>
      
      {!user.address ? (
        <div className={styles.formMessage}>
          <p>Please connect your wallet to create a stream</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="receiverAddress">Receiver Wallet Address</label>
            <input
              id="receiverAddress"
              type="text"
              value={receiverAddress}
              onChange={(e) => setReceiverAddress(e.target.value)}
              placeholder="0x..."
              required
              className={styles.addressInput}
              aria-label="Receiver wallet address"
              aria-describedby="receiverAddressHelp"
            />
            <small id="receiverAddressHelp">Enter the wallet address that will receive the stream</small>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="totalDeposit">Total Deposit (vUSDC)</label>
              <input
                id="totalDeposit"
                type="number"
                value={totalDeposit}
                onChange={(e) => setTotalDeposit(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.000001"
                required
                aria-label="Total deposit amount in USDC"
                aria-describedby="depositHelp"
              />
              <small id="depositHelp">Available: {availableBalance.toFixed(6)} vUSDC</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="durationDays">Duration (days)</label>
              <select
                id="durationDays"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
                aria-label="Stream duration in days"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
              <small>Stream will flow over this period</small>
            </div>
          </div>

          {totalDeposit && durationDays && (
            <div className={styles.preview}>
              <div className={styles.previewLabel}>Stream Preview</div>
              <div className={styles.previewDetails}>
                <div className={styles.previewRow}>
                  <span>Rate per second:</span>
                  <span className={styles.previewValue}>
                    {(() => {
                      const deposit = parseFloat(totalDeposit || 0);
                      const days = parseInt(durationDays || 30);
                      const seconds = days * 24 * 60 * 60;
                      const rate = seconds > 0 ? deposit / seconds : 0;
                      return rate.toFixed(9);
                    })()} vUSDC/s
                  </span>
                </div>
                <div className={styles.previewRow}>
                  <span>Rate per day:</span>
                  <span className={styles.previewValue}>
                    {(() => {
                      const deposit = parseFloat(totalDeposit || 0);
                      const days = parseInt(durationDays || 30);
                      return days > 0 ? (deposit / days).toFixed(6) : '0.000000';
                    })()} vUSDC/day
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !receiverAddress || !totalDeposit || !durationDays}
            className={styles.btnSubmit}
            aria-busy={loading}
            aria-label={loading ? 'Creating stream, please wait' : 'Create new stream'}
          >
            {loading ? 'Creating...' : 'Create Stream'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateStreamForm;

