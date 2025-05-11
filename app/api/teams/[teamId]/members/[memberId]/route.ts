import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { db } from "@/lib/db"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: { teamId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = updateMemberSchema.parse(json)

    // Periksa apakah pengguna yang mengubah adalah owner atau admin
    const userRole = await db.teamMember.findFirst({
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

    // Periksa apakah target adalah owner (tidak bisa diubah)
    const targetMember = await db.teamMember.findUnique({
      where: {
        id: params.memberId,
      },
    })

    if (!targetMember || targetMember.role === "OWNER") {
      return new NextResponse("Cannot modify owner role", { status: 400 })
    }

    const updatedMember = await db.teamMember.update({
      where: {
        id: params.memberId,
      },
      data: {
        role: body.role,
      },
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
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { teamId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Periksa apakah pengguna yang menghapus adalah owner atau admin
    const userRole = await db.teamMember.findFirst({
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

    // Periksa apakah target adalah owner (tidak bisa dihapus)
    const targetMember = await db.teamMember.findUnique({
      where: {
        id: params.memberId,
      },
    })

    if (!targetMember || targetMember.role === "OWNER") {
      return new NextResponse("Cannot remove owner", { status: 400 })
    }

    await db.teamMember.delete({
      where: {
        id: params.memberId,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}