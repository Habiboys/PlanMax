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

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        id: Number(params.invitationId),
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

    // Update invitation status
    await prisma.teamInvitation.update({
      where: { id: Number(params.invitationId) },
      data: { status: "DECLINED" }
    })

    // Create notification for invitation sender
    await prisma.notification.create({
      data: {
        userId: invitation.invitedByUserId,
        type: "team_invitation_declined",
        message: `${session.user.name || session.user.email} has declined the invitation to join team "${invitation.team.name}"`,
        relatedId: invitation.teamId,
        relatedType: "team"
      }
    })

    return NextResponse.json({ 
      success: true,
      message: "Invitation declined successfully"
    })
  } catch (error) {
    console.error("Error declining team invitation:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}