import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../design-system/utils';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'glass' | 'filled' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  glow?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'glass',
      padding = 'md',
      interactive = false,
      glow = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-xl3 smooth-transition';

    const variants = {
      glass:
        'bg-surface-900/75 backdrop-blur-xl border border-border/60 hover:border-brand-500/30 elevation-1',
      filled: 'bg-surface-800/90 border border-border/50 elevation-1',
      bordered: 'bg-transparent border-2 border-border',
      elevated:
        'bg-surface-900/90 border border-border/40 elevation-2',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          interactive && 'cursor-pointer hover:scale-[1.02]',
          glow && 'elevation-lift shadow-glow',
          className
        )}
        whileHover={interactive ? { y: -2 } : undefined}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}

        {/* Subtle gradient overlay */}
        {variant === 'glass' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        )}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for better composition
export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <h3 className={cn('text-lg font-semibold text-neutral-100', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <p className={cn('text-sm text-neutral-400 mt-1', className)}>
    {children}
  </p>
);

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('mt-4 flex items-center gap-2', className)}>
    {children}
  </div>
);

export default Card;
