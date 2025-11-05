import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn, getInitials } from '../../design-system/utils';

export interface AvatarProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  ring?: boolean;
  square?: boolean;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      fallback,
      size = 'md',
      status,
      ring = false,
      square = false,
      className,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-20 h-20 text-2xl',
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5',
    };

    const statusColors = {
      online: 'bg-success-light',
      offline: 'bg-neutral-500',
      away: 'bg-warning-light',
      busy: 'bg-error-light',
    };

    const showFallback = !src || imageError || isLoading;

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center flex-shrink-0',
          'bg-gradient-to-br from-primary-500 to-primary-600',
          'font-semibold text-white',
          sizes[size],
          square ? 'rounded-lg' : 'rounded-full',
          ring && 'ring-2 ring-white/20 ring-offset-2 ring-offset-neutral-900',
          className
        )}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {src && !imageError && (
          <img
            src={src}
            alt={alt}
            className={cn(
              'w-full h-full object-cover',
              square ? 'rounded-lg' : 'rounded-full'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setImageError(true);
              setIsLoading(false);
            }}
          />
        )}

        {showFallback && fallback && (
          <span className="select-none">
            {getInitials(fallback)}
          </span>
        )}

        {!showFallback && isLoading && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse rounded-full" />
        )}

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-neutral-900',
              statusSizes[size],
              statusColors[status],
              status === 'online' && 'animate-pulse'
            )}
          />
        )}
      </motion.div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group Component
export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 5,
  size = 'md',
  className,
}) => {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remaining = childArray.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleChildren}
      {remaining > 0 && (
        <Avatar
          size={size}
          fallback={`+${remaining}`}
          className="bg-neutral-700 ring-2 ring-neutral-900"
        />
      )}
    </div>
  );
};

export default Avatar;
