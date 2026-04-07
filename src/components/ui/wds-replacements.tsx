/**
 * Native replacements for @wanteddev/wds components
 * These maintain the same API but use native elements with Tailwind styling
 */
import { forwardRef, type ReactNode, type InputHTMLAttributes } from 'react';

// Typography component
interface TypographyProps {
  variant?: 
    | 'display1' | 'display2' | 'display3'
    | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6'
    | 'title1' | 'title2' | 'title3'
    | 'body1' | 'body2' | 'body3'
    | 'label1' | 'label2' | 'label3' | 'label4'
    | 'caption1' | 'caption2';
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

const variantStyles: Record<string, string> = {
  display1: 'text-[56px] leading-[1.2] tracking-[-0.02em]',
  display2: 'text-[48px] leading-[1.2] tracking-[-0.02em]',
  display3: 'text-[40px] leading-[1.2] tracking-[-0.01em]',
  heading1: 'text-[36px] leading-[1.25] tracking-[-0.01em]',
  heading2: 'text-[32px] leading-[1.25] tracking-[-0.01em]',
  heading3: 'text-[28px] leading-[1.3]',
  heading4: 'text-[24px] leading-[1.3]',
  heading5: 'text-[22px] leading-[1.35]',
  heading6: 'text-[20px] leading-[1.4]',
  title1: 'text-[18px] leading-[1.45]',
  title2: 'text-[16px] leading-[1.5]',
  title3: 'text-[15px] leading-[1.5]',
  body1: 'text-[16px] leading-[1.6]',
  body2: 'text-[15px] leading-[1.6]',
  body3: 'text-[14px] leading-[1.6]',
  label1: 'text-[15px] leading-[1.4]',
  label2: 'text-[14px] leading-[1.4]',
  label3: 'text-[13px] leading-[1.4]',
  label4: 'text-[12px] leading-[1.4]',
  caption1: 'text-[13px] leading-[1.4]',
  caption2: 'text-[12px] leading-[1.4]',
};

const weightStyles: Record<string, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
};

export function Typography({
  variant = 'body2',
  weight = 'regular',
  color,
  as: Component = 'span',
  className = '',
  children,
  style,
}: TypographyProps) {
  const combinedStyle = color ? { ...style, color } : style;
  return (
    <Component
      className={`${variantStyles[variant] || ''} ${weightStyles[weight] || ''} ${className}`}
      style={combinedStyle}
    >
      {children}
    </Component>
  );
}

// Button component
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'text';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

const buttonVariants: Record<string, string> = {
  primary: 'bg-[#0066FF] text-white hover:bg-[#0052CC] active:bg-[#004099]',
  secondary: 'bg-[#F1F3F5] text-[#1A1A1A] hover:bg-[#E9ECEF] active:bg-[#DEE2E6]',
  tertiary: 'bg-transparent text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/5',
  text: 'bg-transparent text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5]',
};

const buttonSizes: Record<string, string> = {
  xs: 'h-7 px-2.5 text-[12px]',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  children,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariants[variant] || ''}
        ${buttonSizes[size] || ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// TextButton component
interface TextButtonProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function TextButton({
  size = 'md',
  onClick,
  className = '',
  children,
  disabled = false,
}: TextButtonProps) {
  const sizeClasses = {
    sm: 'text-[13px]',
    md: 'text-[14px]',
    lg: 'text-[15px]',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 text-[#0066FF] hover:text-[#0052CC] 
        font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// TextField component
interface TextFieldProps {
  error?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function TextField({
  error = false,
  disabled = false,
  className = '',
  children,
}: TextFieldProps) {
  return (
    <div
      className={`
        relative flex items-center rounded-lg border transition-colors
        ${error ? 'border-red-500' : 'border-[#E5E5E5] hover:border-[#CCC] focus-within:border-[#0066FF]'}
        ${disabled ? 'opacity-50 cursor-not-allowed bg-[#F8F9FA]' : 'bg-white'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// TextFieldContent component
interface TextFieldContentProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
}

export const TextFieldContent = forwardRef<HTMLInputElement, TextFieldContentProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-[13px]',
      md: 'h-10 px-3 text-[14px]',
      lg: 'h-12 px-4 text-[15px]',
    };
    return (
      <input
        ref={ref}
        className={`
          flex-1 bg-transparent outline-none text-[#1A1A1A] placeholder:text-[#999]
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      />
    );
  }
);
TextFieldContent.displayName = 'TextFieldContent';

// Divider component
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  className = '',
}: DividerProps) {
  return (
    <div
      className={`
        bg-[#E5E5E5]
        ${orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'}
        ${className}
      `}
    />
  );
}

// Chip component
interface ChipProps {
  variant?: 'filled' | 'outlined' | 'soft';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'small';
  className?: string;
  children?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const chipSizes = {
  sm: 'h-5 px-2 text-[11px]',
  small: 'h-6 px-3 text-[12px]',
  md: 'h-7 px-3 text-[12px]',
};

export function Chip({
  variant = 'soft',
  color = 'default',
  size = 'md',
  className = '',
  children,
  active = false,
  onClick,
}: ChipProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium transition-colors';
  
  // Active state overrides
  const activeStyles = active
    ? 'bg-[#0066FF] text-white'
    : 'bg-[#F1F3F5] text-[#495057] hover:bg-[#E9ECEF]';
  
  const clickableStyles = onClick ? 'cursor-pointer' : '';
  const sizeStyles = chipSizes[size] || chipSizes.md;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseStyles} ${activeStyles} ${sizeStyles} ${clickableStyles} ${className}`}
      >
        {children}
      </button>
    );
  }

  // Non-interactive chip with variant/color
  const chipVariants = {
    filled: {
      default: 'bg-[#E9ECEF] text-[#495057]',
      primary: 'bg-[#0066FF] text-white',
      success: 'bg-[#10B981] text-white',
      warning: 'bg-[#F59E0B] text-white',
      error: 'bg-[#EF4444] text-white',
    },
    outlined: {
      default: 'border border-[#DEE2E6] text-[#495057]',
      primary: 'border border-[#0066FF] text-[#0066FF]',
      success: 'border border-[#10B981] text-[#10B981]',
      warning: 'border border-[#F59E0B] text-[#F59E0B]',
      error: 'border border-[#EF4444] text-[#EF4444]',
    },
    soft: {
      default: 'bg-[#F1F3F5] text-[#495057]',
      primary: 'bg-[#0066FF]/10 text-[#0066FF]',
      success: 'bg-[#10B981]/10 text-[#059669]',
      warning: 'bg-[#F59E0B]/10 text-[#D97706]',
      error: 'bg-[#EF4444]/10 text-[#DC2626]',
    },
  };

  return (
    <span
      className={`${baseStyles} ${chipVariants[variant]?.[color] || ''} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
}

// ThemeProvider - simple passthrough since we're using Tailwind
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
