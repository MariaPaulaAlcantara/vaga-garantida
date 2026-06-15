import { InputHTMLAttributes } from 'react';
import { formatPhone } from '@/lib/format';

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

export function PhoneInput({
  value,
  onChange,
  className = '',
  placeholder = '(11) 99999-8888',
  ...props
}: PhoneInputProps) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={formatPhone(value)}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      placeholder={placeholder}
      maxLength={15}
      className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 ${className}`}
      {...props}
    />
  );
}
