'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ClayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'green' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const ClayButton = forwardRef<HTMLButtonElement, ClayButtonProps>(
  ({ variant = 'green', size = 'md', className = '', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      green: 'ghrs-clay-btn',
      gold: 'ghrs-clay-btn ghrs-clay-btn-gold',
      danger: 'ghrs-clay-btn bg-gradient-to-br from-red-100 to-red-200 text-red-700 shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -2 }}
        whileTap={{ y: 1, scale: 0.98 }}
        className={`ghrs-clay-btn ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

ClayButton.displayName = 'ClayButton';

export default ClayButton;
