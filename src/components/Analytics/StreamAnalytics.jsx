import React, { useState, useMemo } from 'react';
import { useVolt } from '../../context/VoltContext';
import { useLiveStreamPrice } from '../../hooks/useLiveStreamPrice';
import InfoBox from '../Shared/InfoBox';
import styles from './StreamAnalytics.module.css';

/**
 * StreamAnalytics Component
 * 
 * Displays analytics for streams:
 * - Earnings over time chart
 * - Flow rate visualization
 * - Projected completion
 */

const StreamAnalytics = () => {
  const { activeStreams, user } = useVolt();
  const [selectedStreamId, setSelectedStreamId] = useState('');

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view stream analytics</p>
      </div>
    );
  }

  // Filter user's streams
  const userStreams = activeStreams.filter(
    (stream) =>
      stream.receiver.toLowerCase() === user.address.toLowerCase() ||
      stream.sender.toLowerCase() === user.address.toLowerCase()
  );

  const selectedStream = activeStreams.find((s) => s.id === selectedStreamId);

  if (userStreams.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No streams available for analytics</p>
      </div>
    );
  }

  return (
    <div className={styles.streamAnalytics}>
      <InfoBox title="Stream Analytics" type="info">
        <p>
          Analyze your streams with detailed metrics and visualizations. 
          Track earnings, flow rates, and projected completion dates.
        </p>
        <p><strong>What you can see:</strong></p>
        <ul>
          <li><strong>Total Earned:</strong> Amount already received from streams</li>
          <li><strong>Remaining Balance:</strong> Amount still flowing to you</li>
          <li><strong>Projected Earnings:</strong> Estimated earnings over remaining time</li>
          <li><strong>Flow Rates:</strong> Daily and monthly earning rates</li>
          <li><strong>Progress Charts:</strong> Visual representation of earnings over time</li>
        </ul>
        <p>Select a specific stream to see detailed analytics, or view combined statistics for all streams.</p>
      </InfoBox>

      <div className={styles.header}>
        <h2 className={styles.title}>Stream Analytics</h2>
        {userStreams.length > 1 && (
          <select
            className={styles.streamSelector}
            value={selectedStreamId}
            onChange={(e) => setSelectedStreamId(e.target.value)}
          >
            <option value="">All Streams</option>
            {userStreams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                Stream #{stream.id.slice(-8)}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedStreamId && selectedStream ? (
        <StreamDetailAnalytics stream={selectedStream} />
      ) : (
        <AllStreamsAnalytics streams={userStreams} />
      )}
    </div>
  );
};

/**
 * Analytics for a single stream
 */
const StreamDetailAnalytics = ({ stream }) => {
  const { remainingBalance, timeRemaining, formattedBalance } =
    useLiveStreamPrice(stream, 0, true);

  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - stream.startTime);
  const progress = stream.duration > 0 ? (elapsed / stream.duration) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, progress));

  // Calculate rates
  const ratePerSecond = stream.duration > 0 ? stream.totalDeposit / stream.duration : 0;
  const ratePerDay = ratePerSecond * 60 * 60 * 24;
  const ratePerMonth = ratePerDay * 30;

  // Calculate projected earnings
  const daysRemaining = Math.floor(timeRemaining / (60 * 60 * 24));
  const projectedEarnings = daysRemaining * ratePerDay;

  // Generate data points for earnings chart (last 30 days or stream duration)
  const daysToShow = Math.min(30, Math.floor(stream.duration / (60 * 60 * 24)));
  const chartData = [];
  for (let i = 0; i <= daysToShow; i++) {
    const dayStart = stream.startTime + (i * 24 * 60 * 60);
    const dayElapsed = Math.max(0, now - dayStart);
    const dayProgress = Math.min(1, dayElapsed / (24 * 60 * 60));
    const dayEarnings = dayProgress * ratePerDay;
    chartData.push({
      day: i,
      earnings: Math.min(dayEarnings, ratePerDay),
      cumulative: Math.min(i * ratePerDay, stream.flowedAmount),
    });
  }

  const maxEarnings = Math.max(...chartData.map((d) => d.cumulative), stream.totalDeposit);

  return (
    <div className={styles.detailAnalytics}>
      {/* Key Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Earned</div>
          <div className={styles.metricValue} style={{ color: 'var(--success)' }}>
            {stream.flowedAmount.toFixed(6)} USDC
          </div>
          <div className={styles.metricSubtext}>
            {((stream.flowedAmount / stream.totalDeposit) * 100).toFixed(1)}% of total
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Remaining</div>
          <div className={styles.metricValue} style={{ color: 'var(--accent)' }}>
            {formattedBalance} USDC
          </div>
          <div className={styles.metricSubtext}>
            {((remainingBalance / stream.totalDeposit) * 100).toFixed(1)}% of total
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Projected Earnings</div>
          <div className={styles.metricValue}>
            {projectedEarnings.toFixed(6)} USDC
          </div>
          <div className={styles.metricSubtext}>
            Over next {daysRemaining} days
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Daily Rate</div>
          <div className={styles.metricValue}>
            {ratePerDay.toFixed(6)} USDC/day
          </div>
          <div className={styles.metricSubtext}>
            {ratePerMonth.toFixed(2)} USDC/month
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>Cumulative Earnings Over Time</h3>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            {chartData.map((point, index) => {
              const height = maxEarnings > 0 ? (point.cumulative / maxEarnings) * 100 : 0;
              return (
                <div
                  key={index}
                  className={styles.chartBar}
                  style={{
                    height: `${height}%`,
                    width: `${100 / chartData.length}%`,
                  }}
                  title={`Day ${point.day}: ${point.cumulative.toFixed(2)} USDC`}
                />
              );
            })}
          </div>
          <div className={styles.chartLabels}>
            <span>Start</span>
            <span>Current</span>
            <span>End</span>
          </div>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className={styles.progressSection}>
        <h3 className={styles.sectionTitle}>Stream Progress</h3>
        <div className={styles.progressVisualization}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.progressStats}>
            <div className={styles.progressStat}>
              <span className={styles.progressLabel}>Elapsed</span>
              <span className={styles.progressValue}>
                {Math.floor(elapsed / (60 * 60 * 24))} days
              </span>
            </div>
            <div className={styles.progressStat}>
              <span className={styles.progressLabel}>Remaining</span>
              <span className={styles.progressValue}>
                {daysRemaining} days
              </span>
            </div>
            <div className={styles.progressStat}>
              <span className={styles.progressLabel}>Progress</span>
              <span className={styles.progressValue}>
                {progressPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Analytics for all streams combined
 */
const AllStreamsAnalytics = ({ streams }) => {
  const totalDeposit = streams.reduce((sum, s) => sum + s.totalDeposit, 0);
  const totalFlowed = streams.reduce((sum, s) => sum + s.flowedAmount, 0);
  const totalRemaining = streams.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Calculate average rates
  const totalRatePerDay = streams.reduce((sum, s) => {
    const rate = s.duration > 0 ? (s.totalDeposit / s.duration) * 60 * 60 * 24 : 0;
    return sum + rate;
  }, 0);

  return (
    <div className={styles.allStreamsAnalytics}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Streams</div>
          <div className={styles.summaryValue}>{streams.length}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Deposited</div>
          <div className={styles.summaryValue}>
            {totalDeposit.toFixed(6)} USDC
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Earned</div>
          <div className={styles.summaryValue} style={{ color: 'var(--success)' }}>
            {totalFlowed.toFixed(6)} USDC
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Remaining</div>
          <div className={styles.summaryValue} style={{ color: 'var(--accent)' }}>
            {totalRemaining.toFixed(6)} USDC
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Combined Daily Rate</div>
          <div className={styles.summaryValue}>
            {totalRatePerDay.toFixed(6)} USDC/day
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Overall Progress</div>
          <div className={styles.summaryValue}>
            {totalDeposit > 0 ? ((totalFlowed / totalDeposit) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Stream List */}
      <div className={styles.streamsList}>
        <h3 className={styles.sectionTitle}>Individual Streams</h3>
        <div className={styles.streamsGrid}>
          {streams.map((stream) => {
            const progress =
              stream.duration > 0
                ? ((Date.now() / 1000 - stream.startTime) / stream.duration) * 100
                : 0;
            const progressPercent = Math.min(100, Math.max(0, progress));

            return (
              <div key={stream.id} className={styles.streamCard}>
                <div className={styles.streamCardHeader}>
                  <span className={styles.streamId}>Stream #{stream.id.slice(-8)}</span>
                  <span className={styles.streamProgress}>{progressPercent.toFixed(1)}%</span>
                </div>
                <div className={styles.streamCardBody}>
                  <div className={styles.streamStat}>
                    <span>Earned:</span>
                    <span style={{ color: 'var(--success)' }}>
                      {stream.flowedAmount.toFixed(6)} USDC
                    </span>
                  </div>
                  <div className={styles.streamStat}>
                    <span>Remaining:</span>
                    <span style={{ color: 'var(--accent)' }}>
                      {stream.remainingBalance.toFixed(6)} USDC
                    </span>
                  </div>
                  <div className={styles.progressBarSmall}>
                    <div
                      className={styles.progressFillSmall}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StreamAnalytics;

