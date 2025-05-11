"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TeamInvitation {
  id: number
  teamId: number
  teamName: string
  invitedBy: {
    name: string
    email: string
  } // Changed from string to object with name and email
  role: string
  createdAt: string
}

export function TeamInvitations() {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingInvitation, setProcessingInvitation] = useState<number | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("MEMBER")
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/teams/invitations")
      if (!response.ok) {
        throw new Error("Failed to fetch invitations")
      }
      const data = await response.json()
      setInvitations(data.invitations)
    } catch (error) {
      console.error("Error fetching invitations:", error)
      toast({
        title: "Error",
        description: "Failed to load team invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  const handleAccept = async (invitationId: number) => {
    setProcessingInvitation(invitationId)
    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}/accept`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to accept invitation")
      }

      toast({
        title: "Success",
        description: "You have joined the team",
      })

      // Refresh invitations list
      await fetchInvitations()
      // Refresh page to update team list
      router.refresh()
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleDecline = async (invitationId: number) => {
    setProcessingInvitation(invitationId)
    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}/decline`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to decline invitation")
      }

      toast({
        title: "Success",
        description: "Invitation has been declined",
      })

      // Refresh invitations list
      await fetchInvitations()
    } catch (error) {
      console.error("Error declining invitation:", error)
      toast({
        title: "Error",
        description: "Failed to decline invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeamId || !email) {
      toast({
        title: "Error",
        description: "Email and team must be filled in",
        variant: "destructive",
      })
      return
    }

    setIsAddingMember(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      })

      if (!response.ok) {
        throw new Error("Failed to add member")
      }

      toast({
        title: "Success",
        description: "Team member added successfully",
      })

      setEmail("")
      setRole("MEMBER")
      setSelectedTeamId(null)
      setIsAddingMember(false)
    } catch (error) {
      console.error("Error adding member:", error)
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
          <CardDescription>Loading invitations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
          <CardDescription>No pending team invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tombol "Buat Tim Baru" telah dihapus */}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Invitations</CardTitle>
        <CardDescription>Team invitations awaiting your approval</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <h3 className="font-medium">{invitation.teamName}</h3>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.invitedBy.name} as {invitation.role}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDecline(invitation.id)}
                  disabled={processingInvitation === invitation.id}
                >
                  {processingInvitation === invitation.id ? (
                    <div className="h-5 w-5">
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  ) : (
                    "Decline"
                  )}
                </Button>
                <Button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingInvitation === invitation.id}
                >
                  {processingInvitation === invitation.id ? (
                    <div className="h-5 w-5">
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  ) : (
                    "Accept"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}