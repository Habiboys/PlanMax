import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const addMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

export async function POST(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = addMemberSchema.parse(json)

    // Check if the user adding is an owner or admin
    const userRole = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: session.user.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    })

    if (!userRole) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    })

    if (!userToAdd) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: params.teamId,
          userId: userToAdd.id,
        },
      },
    })

    if (existingMember) {
      return new NextResponse("User already a member", { status: 400 })
    }

    // Create a pending invitation instead of directly adding the member
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: params.teamId,
        userId: userToAdd.id,
        invitedByUserId: session.user.id,
        role: body.role,
        status: "PENDING"
      },
    })

    // Create notification for the invited user
    await prisma.notification.create({
      data: {
        userId: userToAdd.id,
        type: "team_invitation",
        message: `You have been invited to join a team. Please check your invitations.`,
        relatedId: parseInt(params.teamId),
        relatedType: "team",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
}