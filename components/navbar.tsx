import { useSession } from "next-auth/react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Link } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell, Avatar, AvatarImage, AvatarFallback, Calendar, User, Users, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"

export function Navbar() {
  const { data: session } = useSession()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { toast } = useToast()

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Bagian kiri - Logo */}
          <div className="flex flex-1 items-center justify-start min-w-[200px]">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold ml-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl hidden md:block">Smart Project Planner</span>
            </Link>
          </div>

          {/* Bagian kanan */}
          <div className="flex flex-1 items-center justify-end gap-6">
            {session?.user && (
              <div className="flex items-center gap-4">
                {/* Notifikasi */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative rounded-full p-2 hover:bg-accent/50">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Tidak ada notifikasi
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className="flex flex-col items-start gap-1 p-4"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <span className="font-medium">{notification.message}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-center">
                      <div className="space-y-1">
                        <p className="font-medium">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center px-2 py-1.5 hover:bg-accent rounded">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/teams" className="flex items-center px-2 py-1.5 hover:bg-accent rounded">
                        <Users className="mr-2 h-4 w-4" />
                        Tim Saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => signOut()}
                      className="text-red-600 hover:bg-red-100/50 hover:text-red-700"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}