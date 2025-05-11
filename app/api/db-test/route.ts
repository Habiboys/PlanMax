import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection
    const result = await db.$queryRaw`SELECT 1 as connected`

    return NextResponse.json({
      status: "Connected to database successfully",
      result,
    })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json(
      {
        status: "Failed to connect to database",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
