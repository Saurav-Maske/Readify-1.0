import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/40 disabled:bg-primary/50',
  secondary: 'bg-secondary/10 text-primary hover:bg-secondary/20 focus-visible:ring-secondary/40',
  outline: 'border border-gray-200 bg-white text-text hover:bg-gray-50 focus-visible:ring-primary/30',
  ghost: 'bg-transparent text-text hover:bg-gray-100 focus-visible:ring-primary/20',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, leftIcon, children, className = '', disabled, ...rest }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: isDisabled ? 0 : -1 }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        transition={{ duration: 0.15 }}
        disabled={isDisabled}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
