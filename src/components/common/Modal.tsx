import React, { useEffect, useRef } from 'react';
import { X, LucideIcon } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = '',
  id,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[95vw] h-[90vh]',
  };

  return (
    <div
      id={id}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-140 ${
        isLight ? 'bg-black/40' : 'bg-black/80'
      }`}
      onClick={e => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`w-full rounded-2xl border flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-140 ${
          isLight
            ? 'bg-white border-zinc-200 shadow-2xl text-zinc-800'
            : 'bg-[#0B0E12] border-[rgba(255,255,255,0.07)] shadow-[0_20px_50px_rgba(0,0,0,0.72)] text-[#F4F5F7]'
        } ${sizeClasses[size]} ${className}`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div
            className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
              isLight ? 'border-zinc-200 bg-white' : 'border-[rgba(255,255,255,0.07)] bg-[#0B0E12]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isLight
                      ? 'bg-blue-50 border border-blue-200 text-blue-600'
                      : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h3
                    className={`text-sm sm:text-base font-semibold tracking-tight truncate ${
                      isLight ? 'text-zinc-900' : 'text-[#F4F5F7]'
                    }`}
                  >
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isLight ? 'text-zinc-500' : 'text-[#8A919D]'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ml-2 ${
                isLight
                  ? 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                  : 'text-[#8A919D] hover:text-[#F4F5F7] hover:bg-[#151A20]'
              }`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={`flex-1 overflow-y-auto p-5 custom-scrollbar text-xs sm:text-sm ${
            isLight ? 'text-zinc-700 bg-white' : 'text-[#C2C7D0] bg-[#0B0E12]'
          }`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`flex items-center justify-end gap-2.5 px-5 py-3.5 border-t shrink-0 ${
              isLight ? 'border-zinc-200 bg-zinc-50/70' : 'border-[rgba(255,255,255,0.07)] bg-[#080A0D]'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const TradeForgeModal = Modal;
