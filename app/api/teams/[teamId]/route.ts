import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateTeamSchema = z.object({
  name: z.string().min(1, "Nama tim harus diisi"),
  description: z.string().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: {
        id: params.teamId,
        members: {
          some: {
            userId: Number(session.user.id),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
      },
    })

    if (!team) {
      return new NextResponse("Tim tidak ditemukan atau Anda tidak memiliki akses", { status: 404 })
    }

    // Periksa apakah pengguna adalah anggota tim
    const userMember = team.members.find(
      (member) => member.user.id === Number(session.user.id)
    )

    if (!userMember) {
      return new NextResponse("Anda tidak memiliki akses ke tim ini", { status: 403 })
    }

    // Format response
    const formattedTeam = {
      id: team.id,
      name: team.name,
      description: team.description,
      members: team.members.map((member) => ({
        id: member.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role,
      })),
      projects: team.projects,
      userRole: userMember.role,
    }

    return NextResponse.json(formattedTeam)
  } catch (error) {
    console.error("Error fetching team:", error)
    return new NextResponse("Terjadi kesalahan internal", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = updateTeamSchema.parse(json)

    // Periksa apakah pengguna adalah owner tim
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: Number(session.user.id),
        role: "OWNER",
      },
    })

    if (!teamMember) {
      return new NextResponse("Anda tidak memiliki izin untuk mengubah tim ini", { status: 403 })
    }

    const updatedTeam = await prisma.team.update({
      where: {
        id: params.teamId,
      },
      data: {
        name: body.name,
        description: body.description,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    // Format response
    const formattedTeam = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      members: updatedTeam.members.map((member) => ({
        id: member.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role,
      })),
      userRole: "OWNER",
    }

    return NextResponse.json(formattedTeam)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 422 })
    }

    console.error("Error updating team:", error)
    return new NextResponse("Terjadi kesalahan saat memperbarui tim", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: {
        id: params.teamId,
        members: {
          some: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    })

    if (!team) {
      return new NextResponse("Not Found", { status: 404 })
    }

    await prisma.team.delete({
      where: {
        id: params.teamId,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}