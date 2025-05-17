import React, { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  bordered?: boolean;
  elevated?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  footer,
  headerAction,
  noPadding = false,
  bordered = false,
  elevated = true,
  className,
  children,
  ...props
}) => {
  const baseClasses = 'bg-white dark:bg-secondary-800 rounded-lg overflow-hidden';
  const paddingClasses = noPadding ? '' : 'p-6';
  const borderClasses = bordered ? 'border border-secondary-200 dark:border-secondary-700' : '';
  const shadowClasses = elevated ? 'shadow-md' : '';
  
  const cardClasses = twMerge(
    baseClasses,
    paddingClasses,
    borderClasses,
    shadowClasses,
    className
  );

  return (
    <div className={cardClasses} {...props}>
      {(title || headerAction) && (
        <div className={`flex justify-between items-center ${!noPadding ? 'mb-4' : 'px-6 py-4'}`}>
          <div>
            {title && <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">{title}</h3>}
            {subtitle && <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      
      {noPadding ? children : <div>{children}</div>}
      
      {footer && (
        <div className={`border-t border-secondary-200 dark:border-secondary-700 mt-4 ${!noPadding ? 'pt-4' : 'px-6 py-4'}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 