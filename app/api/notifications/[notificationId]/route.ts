import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    const body = await req.json()
    const { read } = body

    const notification = await prisma.notification.update({
      where: {
        id: parseInt(params.notificationId),
        userId: user.id, // Memastikan notifikasi milik user yang bersangkutan
      },
      data: {
        read,
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error("[NOTIFICATION_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 