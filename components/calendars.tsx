"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Circle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface CalendarsProps {
  calendars: {
    name: string
    items: string[]
  }[]
}

export function Calendars({ calendars }: CalendarsProps) {
  // Generate random colors for calendar items
  const getRandomColor = (index: number) => {
    const colors = [
      "text-red-500",
      "text-blue-500",
      "text-green-500",
      "text-yellow-500",
      "text-purple-500",
      "text-pink-500",
      "text-indigo-500",
      "text-orange-500",
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="px-2 py-2">
      <div className="mb-2 px-2 text-lg font-semibold tracking-tight">Calendars</div>
      <div className="space-y-1">
        {calendars.map((calendar, i) => (
          <CalendarGroup key={i} name={calendar.name} items={calendar.items} getColor={getRandomColor} />
        ))}
      </div>
    </div>
  )
}

interface CalendarGroupProps {
  name: string
  items: string[]
  getColor: (index: number) => string
}

function CalendarGroup({ name, items, getColor }: CalendarGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="flex w-full items-center justify-between p-2 font-normal">
          <span>{name}</span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center space-x-2 rounded-md py-1 pl-8">
            <Checkbox id={`calendar-${name}-${i}`} defaultChecked />
            <Circle className={`h-3 w-3 fill-current ${getColor(i)}`} />
            <label htmlFor={`calendar-${name}-${i}`} className="flex-1 text-sm font-normal">
              {item}
            </label>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
