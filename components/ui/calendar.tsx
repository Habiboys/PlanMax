"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { id } from 'date-fns/locale'
import { format } from 'date-fns'

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        // Layout containers
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        
        // Header navigation
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-semibold tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 transition-opacity duration-200 border-none hover:bg-accent"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        
        // Table structure
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: "text-muted-foreground rounded-md w-10 h-8 font-medium text-xs text-center flex items-center justify-center uppercase tracking-wider",
        
        // Calendar rows and cells
        row: "flex w-full",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent/50",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "h-10 w-10 m-0.5"
        ),
        
        // Day styling
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          "transition-colors duration-200 rounded-md"
        ),
        
        // Day states
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          "font-medium shadow-sm"
        ),
        day_today: cn(
          "bg-accent text-accent-foreground font-semibold",
          "ring-2 ring-primary/20"
        ),
        day_outside: "text-muted-foreground/40 opacity-50",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      locale={id}
      formatters={{
        formatCaption: (date, options) => {
          return format(date, "MMMM yyyy", { locale: id });
        },
        formatWeekdayName: (date) => {
          return format(date, "EEEEE", { locale: id }).substring(0, 1).toUpperCase();
        }
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }