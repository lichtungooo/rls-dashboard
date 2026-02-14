/**
 * FloatingCard - Schwebende Karten, die auf der Map angezeigt werden
 * Alle Inhalte (Module, Navigation, etc.) nutzen diese Komponente
 */

import { ReactNode } from 'react';

interface FloatingCardProps {
  children: ReactNode;
  /**
   * Optional: Custom className for additional styling
   */
  className?: string;
  /**
   * Optional: Padding size
   * Default: 'normal'
   */
  padding?: 'none' | 'small' | 'normal' | 'large';
  /**
   * Optional: Shadow intensity
   * Default: 'normal'
   */
  shadow?: 'none' | 'small' | 'normal' | 'large';
  /**
   * Optional: Border radius
   * Default: 'normal'
   */
  rounded?: 'none' | 'small' | 'normal' | 'large' | 'full';
  /**
   * Optional: Background opacity (0-100)
   * Default: 95 (fast undurchsichtig, aber Karte schimmert durch)
   */
  backgroundOpacity?: number;
}

export function FloatingCard({
  children,
  className = '',
  padding = 'normal',
  shadow = 'normal',
  rounded = 'normal',
  backgroundOpacity = 95,
}: FloatingCardProps) {
  const paddingClasses = {
    none: 'p-0',
    small: 'p-2',
    normal: 'p-4',
    large: 'p-6',
  };

  const shadowClasses = {
    none: '',
    small: 'shadow-sm',
    normal: 'shadow-lg',
    large: 'shadow-2xl',
  };

  const roundedClasses = {
    none: '',
    small: 'rounded',
    normal: 'rounded-lg',
    large: 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={`
        ${paddingClasses[padding]}
        ${shadowClasses[shadow]}
        ${roundedClasses[rounded]}
        ${className}
        backdrop-blur-sm
        border border-white/20
        transition-all duration-200
        hover:shadow-xl
      `}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${backgroundOpacity / 100})`,
      }}
    >
      {children}
    </div>
  );
}
