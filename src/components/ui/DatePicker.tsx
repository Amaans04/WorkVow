import React from 'react';
import DatePicker from 'react-datepicker';
import { twMerge } from 'tailwind-merge';
import { Controller, Control } from 'react-hook-form';

interface DatePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  error?: string;
  className?: string;
}

export const DatePickerInput: React.FC<DatePickerProps> = ({
  name,
  control,
  label,
  error,
  className,
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <DatePicker
            selected={field.value}
            onChange={(date: Date | null) => field.onChange(date)}
            className={twMerge(
              'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select date"
          />
        )}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}; 