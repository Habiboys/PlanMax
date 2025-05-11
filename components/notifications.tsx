"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface Notification {
  id: number
  type: string
  message: string
  createdAt: string
  read: boolean
  relatedId?: string | number
  relatedType?: string
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/notifications", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to fetch notifications")
      }
      
      const data = await response.json()
      setNotifications(data.notifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Gagal memuat notifikasi. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        const response = await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ read: true }),
        })

        if (!response.ok) {
          throw new Error("Failed to mark notification as read")
        }

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        )
      } catch (error) {
        console.error("Error marking notification as read:", error)
        toast({
          title: "Error",
          description: "Gagal menandai notifikasi sebagai telah dibaca.",
          variant: "destructive",
        })
      }
    }

    // Handle navigation based on notification type
    if (notification.relatedType === "team") {
      window.location.href = `/dashboard/teams`
    } else if (notification.relatedType === "project") {
      window.location.href = `/dashboard/${notification.relatedId}`
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="space-y-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.createdAt), "d MMM yyyy HH:mm", {
                      locale: id,
                    })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 