import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function testDatabaseConnection() {
  try {
    // Coba query sederhana
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✅ Koneksi database berhasil!', result)
    return true
  } catch (error) {
    console.error('❌ Error koneksi database:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Test koneksi saat file dijalankan langsung
if (require.main === module) {
  testDatabaseConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
} 