import { Notifications } from "@/components/notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, LogIn, LogOut, User, Users } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Link } from "next/navigation"

export function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Bagian kiri - Logo */}
          <div className="flex flex-1 items-center justify-start min-w-[200px]">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold ml-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl hidden md:block">PlanMax</span>
            </Link>
          </div>

          {/* Bagian kanan */}
          <div className="flex flex-1 items-center justify-end gap-6">
            {status === "authenticated" && session?.user ? (
              <div className="flex items-center gap-4">
                {/* Notifikasi */}
                <Notifications />

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
            ) : status === "unauthenticated" ? (
              <Button onClick={() => signIn()} variant="default" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Masuk</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}