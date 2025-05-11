import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { db } from "@/lib/db"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hashId, verifyHashedId } from '@/lib/utils';

const updateTeamSchema = z.object({
  name: z.string().min(1, "Nama tim harus diisi"),
  description: z.string().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the actual team ID by checking against all teams the user has access to
    const userTeams = await db.teamMember.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        teamId: true,
      },
    });

    // Find which team's hashed ID matches the provided hashedId
    const teamId = userTeams.find(team => 
      verifyHashedId(params.teamId, team.teamId)
    )?.teamId;

    if (!teamId) {
      return new NextResponse("Team not found", { status: 404 });
    }

    const team = await db.team.findUnique({
      where: {
        id: params.teamId,
        members: {
          some: {
            userId: session.user.id,
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
      },
    })

    if (!team) {
      return new NextResponse("Not Found", { status: 404 })
    }

    return NextResponse.json(team)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
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

    const team = await db.team.findUnique({
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

    const updatedTeam = await db.team.update({
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

    return NextResponse.json(updatedTeam)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
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

    const team = await db.team.findUnique({
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

    await db.team.delete({
      where: {
        id: params.teamId,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}