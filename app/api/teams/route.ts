import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// Schema validasi untuk membuat tim
const createTeamSchema = z.object({
  name: z.string().min(1, "Nama tim harus diisi"),
  description: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = createTeamSchema.parse(json)

    // Konversi ID dari string ke integer
    const userId = parseInt(session.user.id, 10)

    // Tambahkan log untuk debugging
    console.log("Creating team with data:", {
      name: body.name,
      description: body.description,
      userId: userId
    })

    const team = await db.team.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: userId, // Gunakan nilai integer
        members: {
          create: {
            userId: userId, // Gunakan nilai integer
            role: "OWNER",
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

    // Kembalikan respons dengan format yang konsisten
    return NextResponse.json({ 
      success: true, 
      team 
    })
  } catch (error) {
    // Log error untuk debugging
    console.error("Error creating team:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: error.errors 
      }, { status: 422 })
    }

    return NextResponse.json({ 
      success: false, 
      error: "Internal Error" 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Ambil semua tim yang user adalah anggotanya
    const teams = await db.team.findMany({
      where: {
        members: {
          some: {
            user: {
              email: session.user.email,
            },
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

    // Debug log
    console.log("Teams fetched:", {
      userEmail: session.user.email,
      teamsCount: teams.length,
      teams: teams.map(t => ({ id: t.id, name: t.name }))
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error("[TEAMS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}