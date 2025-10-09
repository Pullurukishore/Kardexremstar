'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar, type DateRange } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { Matcher } from 'react-day-picker';

interface DatePickerProps {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  className?: string;
  mode?: 'single' | 'range';
  disabled?: Matcher | Matcher[];
}

export function DatePicker({
  selected,
  onSelect,
  className,
  mode = 'range',
  disabled,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (range: DateRange | Date | undefined) => {
    if (!range) {
      onSelect(undefined);
      return;
    }
    
    if ('from' in range && 'to' in range) {
      onSelect(range);
    } else if (range instanceof Date) {
      onSelect({ from: range, to: range });
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !selected?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected?.from ? (
              selected.to ? (
                <>
                  {format(selected.from, 'LLL dd, y')} -{' '}
                  {format(selected.to, 'LLL dd, y')}
                </>
              ) : (
                format(selected.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={disabled as any}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
