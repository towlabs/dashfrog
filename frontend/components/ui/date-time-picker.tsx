import * as React from "react";
import { add, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "./time-picker";
 
type DateTimePickerProps = {
  date?: Date
  setDate: (next: Date | undefined) => void
  className?: string
  buttonClassName?: string
  defaultTime?: { hours: number; minutes: number; seconds?: number }
}

export function DateTimePicker({ date, setDate, className, buttonClassName, defaultTime }: DateTimePickerProps) {
 
  /**
   * carry over the current time when a user clicks a new day
   * instead of resetting to 00:00
   */
  const handleSelect = (newDay: Date | undefined) => {
    if (!newDay) return;
    // If a defaultTime is provided, always set that time when selecting a date
    if (defaultTime) {
      const next = new Date(newDay)
      next.setHours(
        defaultTime.hours ?? 0,
        defaultTime.minutes ?? 0,
        defaultTime.seconds ?? 0,
        0
      )
      setDate(next)
      return
    }
    // Otherwise preserve previous time
    if (date) {
      const diff = newDay.getTime() - date.getTime();
      const diffInDays = diff / (1000 * 60 * 60 * 24);
      const newDateFull = add(date, { days: Math.ceil(diffInDays) });
      setDate(newDateFull);
    } else {
      setDate(newDay);
    }
  };
 
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[254px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP HH:mm") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => handleSelect(d)}
        />
        <div className="p-3 border-t border-border">
          <TimePicker setDate={setDate} date={date} />
        </div>
      </PopoverContent>
    </Popover>
  );
}