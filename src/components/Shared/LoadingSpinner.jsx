import React from 'react';
import styles from './LoadingSpinner.module.css';

/**
 * LoadingSpinner Component
 * 
 * Displays a loading spinner
 */

const LoadingSpinner = ({ size = 'medium', fullScreen = false }) => {
  const sizeClass = styles[`size-${size}`];
  const containerClass = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <div className={containerClass}>
      <div className={`${styles.spinner} ${sizeClass}`}>
        <div className={styles.spinnerCircle}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;

