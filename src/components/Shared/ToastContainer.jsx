import React from 'react';
import styles from './ToastContainer.module.css';

/**
 * ToastContainer Component
 * 
 * Displays toast notifications
 */

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          onClick={() => onRemove(toast.id)}
        >
          <div className={styles.toastIcon}>
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className={styles.toastMessage}>{toast.message}</div>
          <button
            className={styles.toastClose}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

