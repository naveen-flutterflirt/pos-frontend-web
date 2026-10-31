import * as React from 'react';
import { Delete, Check } from 'lucide-react';
import { cn } from './utils';

export interface PinPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
  maxLength?: number;
  currentLength?: number;
}

export function PinPad({
  onDigit,
  onDelete,
  onClear,
  onSubmit,
}: PinPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {digits.map((item) => {
        if (item === 'DEL') {
          return (
            <button
              key="del"
              type="button"
              onClick={onDelete}
              className="h-16 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl text-xl font-semibold transition active:scale-95 shadow-sm"
            >
              <Delete className="w-6 h-6" />
            </button>
          );
        }
        if (item === 'C') {
          return (
            <button
              key="clear"
              type="button"
              onClick={onClear}
              className="h-16 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-rose-600 rounded-xl text-xl font-bold transition active:scale-95 shadow-sm"
            >
              C
            </button>
          );
        }
        return (
          <button
            key={item}
            type="button"
            onClick={() => onDigit(item)}
            className="h-16 flex items-center justify-center bg-white hover:bg-gray-50 active:bg-gray-100 text-[#0B1F4B] border border-gray-200 rounded-xl text-2xl font-bold transition active:scale-95 shadow-sm"
          >
            {item}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSubmit}
        className="col-span-3 h-14 mt-2 flex items-center justify-center gap-2 bg-[#E91E7B] hover:bg-[#D0156B] active:scale-[0.99] text-white rounded-xl text-lg font-bold shadow-md transition"
      >
        <Check className="w-6 h-6" />
        Enter PIN
      </button>
    </div>
  );
}

