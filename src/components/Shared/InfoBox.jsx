import React from 'react';
import styles from './InfoBox.module.css';

/**
 * InfoBox Component
 * 
 * Displays helpful information and guidance to users
 */

const InfoBox = ({ title, children, type = 'info' }) => {
  return (
    <div className={`${styles.infoBox} ${styles[type]}`}>
      {title && <h4 className={styles.infoTitle}>{title}</h4>}
      <div className={styles.infoContent}>
        {children}
      </div>
    </div>
  );
};

export default InfoBox;

