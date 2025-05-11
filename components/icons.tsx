import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  BellRing,
  Briefcase,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Home,
  Image,
  Laptop,
  Loader2,
  MoreVertical,
  Pizza,
  Plus,
  Settings,
  Trash,
  User,
  Users,
  X,
  CheckSquare,
  Activity,
  GanttChart,
  Brain,
} from "lucide-react"

import { cn } from "@/lib/utils"

interface IconProps extends React.SVGAttributes<SVGElement> {
  name: keyof typeof Icons
}

export function Icon({ name, className, ...props }: IconProps) {
  const Icon = Icons[name]
  return <Icon className={cn("h-6 w-6", className)} {...props} />
}

export const Icons = {
  logo: Home,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  post: FileText,
  page: File,
  media: Image,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  help: HelpCircle,
  pizza: Pizza,
  notification: BellRing,
  dashboard: BarChart,
  calendar: CalendarDays,
  check: Check,
  users: Users,
  task: CheckSquare,
  briefcase: Briefcase,
  laptop: Laptop,
  activity: Activity,
  barChart: BarChart,
  gantt: GanttChart,
  brain: Brain,
} 