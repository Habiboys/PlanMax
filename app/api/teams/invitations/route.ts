import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        userId: Number(session.user.id),
        status: "PENDING",
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formattedInvitations = invitations.map((invitation) => ({
      id: invitation.id,
      teamId: invitation.teamId,
      teamName: invitation.team.name,
      invitedBy: {
        name: invitation.invitedBy.name,
        email: invitation.invitedBy.email,
      },
      role: invitation.role,
      createdAt: invitation.createdAt,
    }))

    return NextResponse.json({ invitations: formattedInvitations })
  } catch (error) {
    console.error("Error fetching team invitations:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 