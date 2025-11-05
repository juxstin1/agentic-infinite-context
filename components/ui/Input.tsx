import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../design-system/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      size = 'md',
      variant = 'default',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const baseStyles =
      'w-full rounded-xl transition-all duration-200 outline-none placeholder:text-neutral-500';

    const variants = {
      default:
        'bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-100',
      filled:
        'bg-neutral-800/50 border border-transparent hover:bg-neutral-800/70 focus:bg-neutral-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-100',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    };

    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            {label}
          </label>
        )}

        <motion.div
          className="relative"
          animate={isFocused ? { scale: 1 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              baseStyles,
              variants[variant],
              sizes[size],
              hasLeftIcon && 'pl-10',
              hasRightIcon && 'pr-10',
              error && 'border-error-DEFAULT focus:border-error-DEFAULT focus:ring-error-DEFAULT/20',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}

          {/* Focus ring glow */}
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                boxShadow: error
                  ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
                  : '0 0 0 3px rgba(139, 92, 246, 0.1)',
              }}
            />
          )}
        </motion.div>

        {hint && !error && (
          <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-xs text-error-light"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
