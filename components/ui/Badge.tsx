import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../design-system/utils';

export interface BadgeProps extends Omit<HTMLMotionProps<'span'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      dot = false,
      pulse = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200';

    const variants = {
      primary:
        'bg-primary-500/20 text-primary-300 border border-primary-500/30',
      secondary:
        'bg-neutral-700/50 text-neutral-300 border border-neutral-600/50',
      success:
        'bg-success-DEFAULT/20 text-success-light border border-success-DEFAULT/30',
      warning:
        'bg-warning-DEFAULT/20 text-warning-light border border-warning-DEFAULT/30',
      error:
        'bg-error-DEFAULT/20 text-error-light border border-error-DEFAULT/30',
      info:
        'bg-info-DEFAULT/20 text-info-light border border-info-DEFAULT/30',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-xs gap-1.5',
      lg: 'px-3 py-1.5 text-sm gap-2',
    };

    return (
      <motion.span
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        whileHover={{ scale: 1.05 }}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              pulse && 'animate-pulse',
              variant === 'primary' && 'bg-primary-400',
              variant === 'secondary' && 'bg-neutral-400',
              variant === 'success' && 'bg-success-light',
              variant === 'warning' && 'bg-warning-light',
              variant === 'error' && 'bg-error-light',
              variant === 'info' && 'bg-info-light'
            )}
          />
        )}
        {children}
      </motion.span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
