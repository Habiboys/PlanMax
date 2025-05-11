import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface NavProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardNav({ className, ...props }: NavProps) {
  const pathname = usePathname()

  const items = [
    {
      href: "/dashboard",
      title: "Overview",
      icon: "dashboard"
    },
    {
      href: "/dashboard/projects",
      title: "Projects",
      icon: "briefcase"
    },
    {
      href: "/dashboard/tasks",
      title: "Tasks",
      icon: "task"
    },
    {
      href: "/dashboard/teams",
      title: "Teams",
      icon: "users"
    },
    {
      href: "/dashboard/calendar",
      title: "Calendar",
      icon: "calendar"
    },
    {
      href: "/dashboard/reports",
      title: "Reports",
      icon: "barChart"
    },
    {
      href: "/dashboard/settings",
      title: "Settings",
      icon: "settings"
    },
    {
      href: "/ai-project",
      title: "AI Project Creator",
      icon: "brain",
      highlight: true
    }
  ]

  return (
    <nav className={cn("grid gap-2", className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href || pathname?.startsWith(`${item.href}/`)
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start",
            item.highlight && "text-primary font-medium",
          )}
        >
          {item.icon && (
            <Icons
              name={item.icon as keyof typeof Icons}
              className={cn("mr-2 h-4 w-4", item.highlight && "text-primary")}
            />
          )}
          {item.title}
          {item.highlight && (
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Baru
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
} 