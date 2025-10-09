import { DateRange } from 'react-day-picker';

declare module '@/components/date-range-picker' {
  export interface CalendarDateRangePickerProps {
    date?: DateRange;
    onDateChange?: (date: DateRange | undefined) => void;
    className?: string;
  }
  
  export const CalendarDateRangePicker: React.FC<CalendarDateRangePickerProps>;
}
