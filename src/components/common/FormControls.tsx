import React, { forwardRef } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon: Icon,
      iconPosition = 'left',
      inputSize = 'md',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const { theme } = useTrading();
    const isLight = theme === 'light';

    const sizeClasses = {
      sm: 'h-8 text-xs px-2.5 rounded-lg',
      md: 'h-9 text-xs px-3 rounded-xl',
      lg: 'h-10 text-sm px-3.5 rounded-xl',
    };

    const iconPadding = {
      sm: iconPosition === 'left' ? 'pl-8' : 'pr-8',
      md: iconPosition === 'left' ? 'pl-9' : 'pr-9',
      lg: iconPosition === 'left' ? 'pl-10' : 'pr-10',
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className={`block text-xs font-medium select-none ${
              isLight ? 'text-zinc-700' : 'text-slate-300'
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {Icon && iconPosition === 'left' && (
            <div
              className={`absolute left-3 pointer-events-none ${
                isLight ? 'text-zinc-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}

          <input
            id={id}
            ref={ref}
            className={`w-full border font-normal transition-all duration-140 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20'
                : 'bg-[#0C0D12] text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-blue-500/20'
            } ${
              error
                ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                : isLight
                ? 'border-zinc-300 hover:border-zinc-400'
                : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]'
            } ${sizeClasses[inputSize]} ${Icon ? iconPadding[inputSize] : ''} ${className}`}
            {...props}
          />

          {Icon && iconPosition === 'right' && (
            <div
              className={`absolute right-3 pointer-events-none ${
                isLight ? 'text-zinc-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {error && <p className="text-[11px] text-rose-500">{error}</p>}
        {hint && !error && (
          <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
  selectSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, selectSize = 'md', className = '', id, ...props }, ref) => {
    const { theme } = useTrading();
    const isLight = theme === 'light';

    const sizeClasses = {
      sm: 'h-8 text-xs px-2.5 pr-8 rounded-lg',
      md: 'h-9 text-xs px-3 pr-8 rounded-xl',
      lg: 'h-10 text-sm px-3.5 pr-9 rounded-xl',
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className={`block text-xs font-medium select-none ${
              isLight ? 'text-zinc-700' : 'text-slate-300'
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={`w-full appearance-none border transition-all duration-140 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              isLight
                ? 'bg-white text-zinc-900 focus:border-blue-500 focus:ring-blue-500/20'
                : 'bg-[#0C0D12] text-slate-100 focus:border-blue-500/60 focus:ring-blue-500/20'
            } ${
              error
                ? 'border-rose-500/50 focus:border-rose-500'
                : isLight
                ? 'border-zinc-300 hover:border-zinc-400'
                : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]'
            } ${sizeClasses[selectSize]} ${className}`}
            {...props}
          >
            {options
              ? options.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className={isLight ? 'bg-white text-zinc-900' : 'bg-[#12141A] text-slate-100'}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className={`w-4 h-4 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-zinc-500' : 'text-slate-400'
            }`}
          />
        </div>

        {error && <p className="text-[11px] text-rose-500">{error}</p>}
        {hint && !error && (
          <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const { theme } = useTrading();
    const isLight = theme === 'light';

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className={`block text-xs font-medium select-none ${
              isLight ? 'text-zinc-700' : 'text-slate-300'
            }`}
          >
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={`w-full p-3 rounded-xl border text-xs transition-all duration-140 focus:outline-none focus:ring-1 disabled:opacity-50 resize-y min-h-[80px] ${
            isLight
              ? 'bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20'
              : 'bg-[#0C0D12] text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-blue-500/20'
          } ${
            error
              ? 'border-rose-500/50 focus:border-rose-500'
              : isLight
              ? 'border-zinc-300 hover:border-zinc-400'
              : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-rose-500">{error}</p>}
        {hint && !error && (
          <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';
  const isSm = size === 'sm';

  return (
    <label
      className={`flex items-start gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex shrink-0 transition-colors duration-140 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          isSm ? 'w-8 h-4' : 'w-10 h-5'
        } ${
          checked
            ? 'bg-blue-600'
            : isLight
            ? 'bg-zinc-200 border border-zinc-300'
            : 'bg-[#1C1F27] border border-[rgba(255,255,255,0.08)]'
        }`}
      >
        <span
          className={`inline-block rounded-full bg-white transition-transform duration-140 shadow-xs ${
            isSm ? 'w-3 h-3 mt-0.5' : 'w-4 h-4 mt-0.5'
          } ${checked ? (isSm ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5'}`}
        />
      </button>
      {(label || description) && (
        <div className="text-xs">
          {label && (
            <span
              className={`font-medium block ${isLight ? 'text-zinc-900' : 'text-slate-200'}`}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              className={`text-[11px] block mt-0.5 ${
                isLight ? 'text-zinc-500' : 'text-slate-400'
              }`}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};

export const ToggleSwitch = Toggle;

export interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children,
  className = '',
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  return (
    <section
      className={`p-5 rounded-2xl border space-y-4 ${
        isLight
          ? 'bg-white border-zinc-200 shadow-xs'
          : 'bg-[#0F1117] border-[rgba(255,255,255,0.06)]'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`mt-0.5 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
            {icon}
          </div>
        )}
        <div>
          <h3
            className={`text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}
          >
            {title}
          </h3>
          {description && (
            <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
};

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  children,
  className = '',
}) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return <div className={`grid gap-4 ${colClass} ${className}`}>{children}</div>;
};

export interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  hint,
  error,
  children,
  className = '',
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          className={`block text-xs font-medium ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}
        >
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
      {hint && !error && (
        <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>{hint}</p>
      )}
    </div>
  );
};

export const TradeForgeInput = Input;
export const TradeForgeSelect = Select;
export const TradeForgeTextarea = Textarea;
export const TradeForgeToggle = Toggle;
