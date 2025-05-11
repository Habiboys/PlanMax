"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Settings, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Sign Up</Button>
        </Link>
      </div>
    )
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ redirect: false })
    router.push("/")
    setIsSigningOut(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || "/placeholder.svg"} alt={session.user.name || "User"} />
            <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSigningOut} onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
