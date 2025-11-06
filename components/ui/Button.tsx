import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../design-system/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium smooth-transition rounded-xl2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';

    const variants = {
      primary:
        'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white elevation-lift focus:ring-2 focus:ring-brand-500/50',
      secondary:
        'bg-surface-800/70 hover:bg-surface-700/70 text-text-primary border border-border/60 backdrop-blur-xl elevation-1 focus:ring-2 focus:ring-brand-500/50',
      ghost: 'text-text-secondary hover:bg-surface-800/50 hover:text-text-primary focus:ring-2 focus:ring-brand-500/50',
      danger:
        'bg-gradient-to-r from-error-DEFAULT to-error-light hover:from-error-DEFAULT/90 hover:to-error-light/90 text-white elevation-lift focus:ring-2 focus:ring-error-DEFAULT/50',
      success:
        'bg-gradient-to-r from-success-DEFAULT to-success-light hover:from-success-DEFAULT/90 hover:to-success-light/90 text-white elevation-lift focus:ring-2 focus:ring-success-DEFAULT/50',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}

        {/* Shine effect on hover */}
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
