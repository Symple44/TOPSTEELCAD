import React from 'react';

// Card Components
export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`} style={{ padding: '1rem', ...style }}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pb-3 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold ${className}`}>
    {children}
  </h3>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

// Button Component
export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, onClick, disabled = false, variant = 'default', size = 'default', className = '', style }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none';
  const variantStyles = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white hover:bg-gray-100',
    ghost: 'hover:bg-gray-100'
  };
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4',
    lg: 'h-12 px-8',
    icon: 'h-10 w-10'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
};

// Input Component
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

// Label Component
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className = '', ...props }) => (
  <label
    className={`text-sm font-medium leading-none ${className}`}
    {...props}
  >
    {children}
  </label>
);

// Select Components
export const Select: React.FC<{
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child as any, { onClick: () => setIsOpen(!isOpen), value });
          }
          if (child.type === SelectContent && isOpen) {
            return React.cloneElement(child as any, { onValueChange, onClose: () => setIsOpen(false) });
          }
        }
        return null;
      })}
    </div>
  );
};

export const SelectTrigger: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  value?: string;
  className?: string;
}> = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  >
    {children}
  </button>
);

export const SelectContent: React.FC<{
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  onClose?: () => void;
}> = ({ children, onValueChange, onClose }) => (
  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
    {React.Children.map(children, child => {
      if (React.isValidElement(child) && child.type === SelectItem) {
        return React.cloneElement(child as any, {
          onClick: (value: string) => {
            onValueChange?.(value);
            onClose?.();
          }
        });
      }
      return child;
    })}
  </div>
);

export const SelectItem: React.FC<{
  value: string;
  children: React.ReactNode;
  onClick?: (value: string) => void;
}> = ({ value, children, onClick }) => (
  <div
    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
    onClick={() => onClick?.(value)}
  >
    {children}
  </div>
);

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder = 'Select...' }) => (
  <span>{placeholder}</span>
);

// Tabs Components
export const Tabs: React.FC<{
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ defaultValue, value: controlledValue, onValueChange, children, className = '' }) => {
  const [value, setValue] = React.useState(controlledValue || defaultValue || '');

  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { value, onValueChange: handleValueChange });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList: React.FC<{
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}> = ({ children, className = '', value, onValueChange }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
    {React.Children.map(children, child => {
      if (React.isValidElement(child) && child.type === TabsTrigger) {
        return React.cloneElement(child as any, {
          isActive: value === (child.props as any).value,
          onClick: () => onValueChange?.((child.props as any).value)
        });
      }
      return child;
    })}
  </div>
);

export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}> = ({ children, isActive, onClick }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
      isActive ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className = '' }) => {
  const tabsContext = React.useContext(TabsContext);
  if (tabsContext?.value !== value) return null;
  return <div className={className}>{children}</div>;
};

const TabsContext = React.createContext<{ value: string } | null>(null);

// Switch Component
export const Switch: React.FC<{
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked = false, onCheckedChange, disabled = false }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// Slider Component
export const Slider: React.FC<{
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}> = ({ value = [0], onValueChange, min = 0, max = 100, step = 1, className = '' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.([Number(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={`w-full ${className}`}
    />
  );
};

// ScrollArea Component
export const ScrollArea: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style }) => (
  <div className={`overflow-auto ${className}`} style={style}>
    {children}
  </div>
);

// Badge Component
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  className?: string;
}> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Dialog Components
export const Dialog: React.FC<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ open = false, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-lg bg-white rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4">
    {children}
  </div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-semibold">
    {children}
  </h2>
);

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-end gap-2 mt-4">
    {children}
  </div>
);

// Alert Components
export const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">
    {children}
  </div>
);

// Checkbox Component
export const Checkbox: React.FC<{
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ id, checked = false, onCheckedChange, disabled = false }) => (
  <input
    id={id}
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    disabled={disabled}
    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
  />
);

// Textarea Component
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea
    className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);