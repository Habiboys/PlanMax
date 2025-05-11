import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: { invitationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Await params before using them
    const { invitationId } = await params

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        id: Number(invitationId),
        userId: Number(session.user.id),
        status: "PENDING"
      },
      include: {
        team: true,
      }
    })

    if (!invitation) {
      return new NextResponse("Invitation not found or already processed", { status: 404 })
    }

    // Create team membership
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: Number(session.user.id),
        role: invitation.role,
      }
    })

    // Update invitation status
    await prisma.teamInvitation.update({
      where: { id: Number(invitationId) },
      data: { status: "ACCEPTED" }
    })

    // Create notification for invitation sender
    await prisma.notification.create({
      data: {
        userId: invitation.invitedByUserId,
        type: "team_invitation_accepted",
        message: `${session.user.name || session.user.email} has accepted the invitation to join team "${invitation.team.name}"`,
        relatedId: Number(invitation.teamId),
        relatedType: "team"
      }
    })

    return NextResponse.json({ 
      success: true,
      message: "Invitation accepted successfully"
    })
  } catch (error) {
    console.error("Error accepting team invitation:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}