import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"
import { writeFile } from "fs/promises"
import path from "path"
import { mkdir } from "fs/promises"

/**
 * POST /api/user/avatar
 * Upload and update user avatar
 */
export async function POST(req: NextRequest) {
  try {
    // Get session to identify the user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Tidak terotentikasi" },
        { status: 401 }
      )
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 }
      )
    }
    
    // Get file from form data
    const formData = await req.formData()
    const file = formData.get("avatar") as File
    
    if (!file) {
      return NextResponse.json(
        { message: "Tidak ada file yang diunggah" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Format file tidak didukung. Silakan unggah file JPG, JPEG, atau PNG" },
        { status: 400 }
      )
    }
    
    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "Ukuran file terlalu besar. Ukuran maksimal adalah 5MB" },
        { status: 400 }
      )
    }
    
    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public/uploads/avatars")
    await mkdir(uploadDir, { recursive: true })
    
    // Create unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = path.join(uploadDir, fileName)
    const fileUrl = `/uploads/avatars/${fileName}`
    
    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    
    // Update user's avatar URL in database
    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: fileUrl }
    })
    
    return NextResponse.json({
      message: "Avatar berhasil diperbarui",
      avatarUrl: fileUrl
    })
    
  } catch (error) {
    console.error("[API_USER_AVATAR_UPDATE]", error)
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengunggah avatar" },
      { status: 500 }
    )
  }
} 