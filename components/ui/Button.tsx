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
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';

    const variants = {
      primary:
        'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-lg shadow-primary-500/25 focus:ring-primary-500',
      secondary:
        'bg-white/5 hover:bg-white/10 text-neutral-100 border border-white/10 backdrop-blur-xl focus:ring-primary-500',
      ghost: 'text-neutral-300 hover:bg-white/5 hover:text-white focus:ring-primary-500',
      danger:
        'bg-gradient-to-r from-error-DEFAULT to-error-light hover:from-error-dark hover:to-error-DEFAULT text-white shadow-lg shadow-error-DEFAULT/25 focus:ring-error-DEFAULT',
      success:
        'bg-gradient-to-r from-success-DEFAULT to-success-light hover:from-success-dark hover:to-success-DEFAULT text-white shadow-lg shadow-success-DEFAULT/25 focus:ring-success-DEFAULT',
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
