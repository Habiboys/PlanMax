"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Award,
  Lightbulb,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { Notifications } from "@/components/notifications";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl mx-auto items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-4 flex">
          <Link href="/" className="mr-2 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-bold">PLANMAX</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={cn(
                  "gap-2",
                  pathname.startsWith("/dashboard") &&
                    !pathname.includes("/teams") &&
                    !pathname.includes("/points")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Proyek</span>
              </Button>
            </Link>
            <Link href="/ai-project">
              <Button
                variant="ghost"
                className={cn(
                  "gap-2",
                  pathname.startsWith("/ai-project") &&
                    !pathname.includes("/teams") &&
                    !pathname.includes("/points")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Lightbulb className="h-4 w-4" />
                <span>Buat Project Dengan AI</span>
              </Button>
            </Link>
            <Link href="/dashboard/teams">
              <Button
                variant="ghost"
                className={cn(
                  "gap-2",
                  pathname.includes("/teams")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                <span>Teams</span>
              </Button>
            </Link>
            <Link href="/dashboard/points">
              <Button
                variant="ghost"
                className={cn(
                  "gap-2",
                  pathname.includes("/points")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Award className="h-4 w-4" />
                <span>Poin & Level</span>
              </Button>
            </Link>
          </nav>
          
          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col gap-4 py-4">
                <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname.startsWith("/dashboard") &&
                        !pathname.includes("/teams") &&
                        !pathname.includes("/points")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Proyek</span>
                  </Button>
                </Link>
                <Link href="/ai-project" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname.startsWith("/ai-project") &&
                        !pathname.includes("/teams") &&
                        !pathname.includes("/points")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span>Buat Project Dengan AI</span>
                  </Button>
                </Link>
                <Link href="/dashboard/teams" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname.includes("/teams")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span>Teams</span>
                  </Button>
                </Link>
                <Link href="/dashboard/points" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname.includes("/points")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Award className="h-4 w-4" />
                    <span>Poin & Level</span>
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center space-x-1">
            <ModeToggle />
            <Notifications />
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}
