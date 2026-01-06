import React from 'react';
import { useVolt } from '../../context/VoltContext';
import StreamCard from './StreamCard';
import InfoBox from '../Shared/InfoBox';
import styles from './StreamList.module.css';

/**
 * StreamList Component - Dashboard View
 * 
 * Displays all active streams owned by the user
 */

const StreamList = ({ onNavigateToCreateStream }) => {
  const { activeStreams, user } = useVolt();

  // Filter streams owned by user (receiver)
  // NOTE: In the current contract, sender and receiver are the same (user creates stream for themselves)
  // So we show all streams where user is either sender or receiver
  const userStreams = activeStreams.filter(
    (stream) => {
      if (!user.address) return false;
      const userAddr = user.address.toLowerCase();
      const receiverAddr = stream.receiver?.toLowerCase();
      const senderAddr = stream.sender?.toLowerCase();
      return receiverAddr === userAddr || senderAddr === userAddr;
    }
  );

  // Filter streams sent by user (same as userStreams in current implementation)
  const sentStreams = activeStreams.filter(
    (stream) => {
      if (!user.address) return false;
      const userAddr = user.address.toLowerCase();
      const senderAddr = stream.sender?.toLowerCase();
      return senderAddr === userAddr;
    }
  );

  // Debug logging (moved after variable declarations)
  React.useEffect(() => {
    console.log('📊 StreamList Debug:', {
      activeStreamsCount: activeStreams.length,
      activeStreams: activeStreams,
      userAddress: user.address,
      userStreamsCount: userStreams.length,
      sentStreamsCount: sentStreams.length,
      firstStream: activeStreams[0],
      streamDetails: activeStreams.map(s => ({
        id: s.id,
        sender: s.sender,
        receiver: s.receiver,
        totalDeposit: s.totalDeposit,
      })),
    });
  }, [activeStreams, user.address, userStreams.length, sentStreams.length]);

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view your streams</p>
      </div>
    );
  }

  return (
    <div className={styles.streamList}>
      {/* Info Box */}
      <InfoBox title="Streaming Dashboard" type="info">
        <p>
          The <strong>Streaming Dashboard</strong> is where you view and manage all your payment streams. 
          A stream is a continuous payment flow where money is transferred from a payer to a receiver over time.
        </p>
        <p><strong>What you can do here:</strong></p>
        <ul>
          <li><strong>View Streams:</strong> Monitor your incoming and outgoing streams with real-time balance updates.</li>
          <li><strong>Claim Income:</strong> As the receiver, withdraw your accrued earnings at any time.</li>
          <li><strong>Stream Details:</strong> Click on any stream card to see detailed information and actions.</li>
          <li><strong>Create New Stream:</strong> Use the "Create Stream" page in the sidebar to start a new payment stream.</li>
        </ul>
      </InfoBox>

      {/* Create Stream Button */}
      {user.address && (
        <div className={styles.createStreamSection}>
          <button 
            className={styles.createStreamButton}
            onClick={onNavigateToCreateStream}
            aria-label="Navigate to create stream page"
          >
            <span className={styles.buttonText}>Create New Stream</span>
            <span className={styles.buttonArrow}>→</span>
          </button>
        </div>
      )}

      {/* Incoming Streams */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Incoming Streams
        </h2>
        <p className={styles.sectionSubtitle}>
          {userStreams.length} active stream{userStreams.length !== 1 ? 's' : ''} you are receiving
        </p>
        {userStreams.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No incoming streams</p>
          </div>
        ) : (
          <div className={styles.streamGrid}>
            {userStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} type="incoming" />
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Streams */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Outgoing Streams
        </h2>
        <p className={styles.sectionSubtitle}>
          {sentStreams.length} active stream{sentStreams.length !== 1 ? 's' : ''} you have created
        </p>
        {sentStreams.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No outgoing streams</p>
          </div>
        ) : (
          <div className={styles.streamGrid}>
            {sentStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} type="outgoing" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamList;

