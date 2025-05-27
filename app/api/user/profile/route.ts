import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash, compare } from "bcryptjs"

/**
 * PUT /api/user/profile
 * Update user profile, including name, email, and optional password change
 */
export async function PUT(req: NextRequest) {
  try {
    // Get session to identify the user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Tidak terotentikasi" },
        { status: 401 }
      )
    }
    
    // Get data from request body
    const body = await req.json()
    const { name, email, currentPassword, newPassword } = body
    
    // Ensure there's data to update
    if (!name && !email && !newPassword) {
      return NextResponse.json(
        { message: "Tidak ada data untuk diperbarui" },
        { status: 400 }
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
    
    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { message: "Kata sandi saat ini diperlukan" },
          { status: 400 }
        )
      }
      
      // Verify current password
      const isPasswordValid = await compare(currentPassword, user.passwordHash || '')
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { message: "Kata sandi saat ini tidak valid" },
          { status: 400 }
        )
      }
      
      // Hash new password
      const hashedPassword = await hash(newPassword, 10)
      
      // Update user with new password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      })
    }
    
    // Update basic profile information (name and email)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        email: email || user.email,
      }
    })
    
    return NextResponse.json({
      message: "Profil berhasil diperbarui",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    })
    
  } catch (error) {
    console.error("[API_USER_PROFILE_UPDATE]", error)
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui profil" },
      { status: 500 }
    )
  }
} 