"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// Tambahkan fungsi untuk memastikan tabel user_points_history ada
async function ensureUserPointsHistoryTableExists() {
  try {
    // Periksa apakah tabel user_points_history ada
    const hasTable = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_points_history'
      ) AS has_points_history_table;
    `;

    if (!hasTable || !(hasTable as any)[0]?.has_points_history_table) {
      // Jika tidak ada, buat tabel
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS user_points_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_points_history_user_id ON user_points_history(user_id);
      `;
      
      console.log("Created user_points_history table");
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring user_points_history table exists:", error);
    return false;
  }
}

// Tambahkan fungsi untuk memastikan kolom points dan level ada
async function ensurePointsColumnsExist() {
  try {
    // Periksa apakah kolom points dan level ada di tabel users
    const hasColumns = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'points'
      ) AS has_points_column;
    `;

    if (!hasColumns || !(hasColumns as any)[0]?.has_points_column) {
      // Jika tidak ada, tambahkan kolom
      await db.$executeRaw`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
      `;
      
      console.log("Added points and level columns to users table");
    }
    
    // Pastikan tabel riwayat poin juga ada
    await ensureUserPointsHistoryTableExists();
    
    return true;
  } catch (error) {
    console.error("Error ensuring points columns exist:", error);
    return false;
  }
}

// Konstanta untuk sistem level
const LEVEL_THRESHOLDS = [
  0,     // Level 1: 0 poin
  100,   // Level 2: 100 poin
  250,   // Level 3: 250 poin
  500,   // Level 4: 500 poin
  1000,  // Level 5: 1000 poin
  2000,  // Level 6: 2000 poin
  3500,  // Level 7: 3500 poin
  5000,  // Level 8: 5000 poin
  7500,  // Level 9: 7500 poin
  10000, // Level 10: 10000 poin
]

// Fungsi untuk mendapatkan level berdasarkan poin
function calculateLevelFromPoints(points: number): number {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

// Fungsi untuk mendapatkan poin yang dibutuhkan untuk naik level berikutnya
function getPointsForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return -1 // Sudah level maksimum
  }
  return LEVEL_THRESHOLDS[currentLevel]
}

// Fungsi untuk menghitung berapa poin yang dibutuhkan dari level saat ini ke level berikutnya
function getPointsNeededForNextLevel(currentPoints: number, currentLevel: number): number {
  console.log("getPointsNeededForNextLevel input:", { currentPoints, currentLevel });
  
  const nextLevelThreshold = getPointsForNextLevel(currentLevel);
  if (nextLevelThreshold === -1) return 0; // Sudah level maksimum
  
  const pointsNeeded = Math.max(0, nextLevelThreshold - currentPoints);
  
  console.log("getPointsNeededForNextLevel result:", { 
    nextLevelThreshold, 
    currentPoints, 
    pointsNeeded 
  });
  
  return pointsNeeded;
}

// Fungsi untuk mendapatkan informasi poin dan level pengguna
export async function getUserPointsInfo() {
  try {
    // Pastikan kolom points dan level ada
    await ensurePointsColumnsExist();
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    // Ubah query untuk menghindari penggunaan kolom yang mungkin belum ada
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "Pengguna tidak ditemukan" }
    }

    // Akses kolom secara dinamis, dengan nilai default jika tidak ada
    const points = user['points'] != null ? Number(user['points']) : 0;
    const level = user['level'] != null ? Number(user['level']) : 1;
    
    // Hitung informasi level
    const pointsForNextLevel = getPointsForNextLevel(level)
    const pointsNeeded = getPointsNeededForNextLevel(points, level)

    console.log("Detailed level info:", {
      level,
      points,
      currentLevelThreshold: LEVEL_THRESHOLDS[level - 1] || 0,
      nextLevelThreshold: pointsForNextLevel,
      pointsNeeded,
      thresholds: LEVEL_THRESHOLDS
    });

    // Ambil riwayat poin terbaru menggunakan raw query yang lebih aman
    let recentHistory = [];
    try {
      const historyExists = await db.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_points_history'
        ) AS exists;
      `;
      
      if (historyExists && (historyExists as any)[0]?.exists) {
        recentHistory = await db.$queryRaw`
          SELECT uph.id, uph.points, uph.reason, uph.created_at,
                 t.id as task_id, t.name as task_name
          FROM user_points_history uph
          LEFT JOIN tasks t ON uph.task_id = t.id
          WHERE uph.user_id = ${user.id}
          ORDER BY uph.created_at DESC
          LIMIT 10
        `;
        
        // Transform data to match the expected format
        recentHistory = recentHistory.map((item: any) => ({
          id: item.id,
          userId: user.id,
          points: item.points,
          reason: item.reason,
          taskId: item.task_id,
          createdAt: item.created_at,
          task: item.task_id ? { name: item.task_name } : null
        }));
      }
    } catch (error) {
      console.error("Error fetching points history:", error);
      recentHistory = [];
    }

    return { 
      user: {
        id: user.id,
        name: user.name,
        points,
        level,
        pointsForNextLevel,
        pointsNeeded,
      },
      recentHistory
    }
  } catch (error) {
    console.error("Error getting user points info:", error)
    return { error: "Terjadi kesalahan saat mengambil informasi poin" }
  }
}

// Fungsi untuk menambahkan poin saat tugas selesai
export async function addTaskCompletionPoints(taskId: number) {
  try {
    console.log(`Starting addTaskCompletionPoints for taskId=${taskId}`);
    
    // Pastikan tabel dan kolom yang diperlukan ada
    const columnsExist = await ensurePointsColumnsExist();
    const tableExists = await ensureUserPointsHistoryTableExists();
    
    console.log(`Database check: columnsExist=${columnsExist}, tableExists=${tableExists}`);
    
    if (!columnsExist || !tableExists) {
      return { error: "Gagal memastikan struktur database yang dibutuhkan" };
    }
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "Pengguna tidak ditemukan" }
    }
    
    console.log(`User found: id=${user.id}, email=${session.user.email}`);

    // Ambil info tugas dengan raw query untuk menghindari masalah schema
    const taskResult = await db.$queryRaw`
      SELECT id, name, assignee_id, status, points_value
      FROM tasks
      WHERE id = ${taskId}
    `;
    
    if (!taskResult || !(taskResult as any[])[0]) {
      return { error: "Tugas tidak ditemukan" }
    }
    
    const task = (taskResult as any[])[0];
    console.log(`Task found: id=${task.id}, name=${task.name}, assigneeId=${task.assignee_id}, status=${task.status}, pointsValue=${task.points_value}`);

    // Pastikan user adalah assignee dari tugas ini
    if (task.assignee_id !== user.id) {
      console.log(`User mismatch: taskAssigneeId=${task.assignee_id}, currentUserId=${user.id}`);
      return { error: `Anda bukan penanggung jawab tugas ini (${task.assignee_id} != ${user.id})` }
    }
    
    // Pastikan status task adalah "Completed"
    if (task.status !== "Completed") {
      console.log(`Task not completed: status=${task.status}`);
      return { error: "Tugas belum selesai (status harus 'Completed')" }
    }

    // Cek apakah poin sudah diberikan sebelumnya menggunakan raw query
    const existingPoints = await db.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM user_points_history
        WHERE user_id = ${user.id}
        AND task_id = ${task.id}
        AND reason = 'Task Completion'
      ) as has_points;
    `;
    
    const hasPoints = (existingPoints as any)[0]?.has_points;
    console.log(`Points check: hasPoints=${hasPoints}`);

    if (hasPoints) {
      return { error: "Poin sudah diberikan untuk tugas ini" }
    }

    // Gunakan nilai points_value dari task jika ada, atau default ke 10
    const pointsToAdd = task.points_value || 10;
    const userPoints = (user as any).points || 0;
    const totalPoints = userPoints + pointsToAdd;
    
    console.log(`Points calculation: current=${userPoints}, toAdd=${pointsToAdd}, total=${totalPoints}`);

    // Hitung level baru
    const currentLevel = (user as any).level || 1;
    const newLevel = calculateLevelFromPoints(totalPoints);
    const levelUp = newLevel > currentLevel;
    
    console.log(`Level calculation: current=${currentLevel}, new=${newLevel}, levelUp=${levelUp}`);

    try {
      // Update poin dan level user dengan raw query
      await db.$executeRaw`
        UPDATE users
        SET points = ${totalPoints}, level = ${newLevel}
        WHERE id = ${user.id}
      `;
      
      // Catat riwayat poin dengan raw query
      await db.$executeRaw`
        INSERT INTO user_points_history (user_id, task_id, points, reason, created_at)
        VALUES (${user.id}, ${task.id}, ${pointsToAdd}, 'Task Completion', CURRENT_TIMESTAMP)
      `;
      
      console.log(`Database updated successfully: points=${totalPoints}, level=${newLevel}`);
    } catch (dbError) {
      console.error("Database error:", dbError);
      return { error: "Gagal memperbarui database: " + (dbError as any).message };
    }

    // Jika naik level, buat notifikasi
    if (levelUp) {
      try {
        await db.notification.create({
          data: {
            userId: user.id,
            type: "level_up",
            message: `Selamat! Anda telah naik ke level ${newLevel}`,
          },
        });
        console.log(`Level up notification created for level ${newLevel}`);
      } catch (notifError) {
        console.error("Notification error:", notifError);
        // Tetap lanjutkan meskipun ada error notifikasi
      }
    }

    console.log(`Points added successfully: ${pointsToAdd} points`);
    return { 
      success: true, 
      pointsAdded: pointsToAdd, 
      totalPoints,
      newLevel,
      levelUp
    }
  } catch (error) {
    console.error("Error adding task completion points:", error)
    return { error: "Terjadi kesalahan saat menambahkan poin: " + (error as any).message }
  }
}

// Fungsi untuk mengatur nilai poin tugas
export async function setTaskPointsValue(taskId: number, pointsValue: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "Pengguna tidak ditemukan" }
    }

    // Cek apakah tugas ada
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: user.id,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        }
      }
    })

    if (!task) {
      return { error: "Tugas tidak ditemukan" }
    }

    // Pastikan user adalah admin atau owner proyek
    if (task.project.members.length === 0) {
      return { error: "Anda tidak memiliki izin untuk mengubah nilai poin tugas" }
    }

    // Update nilai poin tugas
    await db.task.update({
      where: { id: taskId },
      data: {
        pointsValue,
      },
    })

    return { success: true, pointsValue }
  } catch (error) {
    console.error("Error setting task points value:", error)
    return { error: "Terjadi kesalahan saat mengatur nilai poin tugas" }
  }
}

// Fungsi untuk mendapatkan leaderboard
export async function getPointsLeaderboard() {
  try {
    // Pastikan kolom points dan level ada
    await ensurePointsColumnsExist();
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    // Gunakan raw query untuk mengambil data
    const leaderboard = await db.$queryRaw`
      SELECT id, name, avatar, 
             COALESCE(points, 0) as points, 
             COALESCE(level, 1) as level
      FROM users
      ORDER BY COALESCE(points, 0) DESC, name ASC
      LIMIT 10
    `;

    // Ambil posisi/rank pengguna yang sedang login
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return { error: "Pengguna tidak ditemukan" }
    }

    // Gunakan nilai default jika kolom belum ada
    const userPoints = (currentUser as any).points || 0;
    const userLevel = (currentUser as any).level || 1;

    // Hitung posisi/rank pengguna dengan raw query yang hanya menghitung pengguna dengan poin lebih tinggi
    const rankResult = await db.$queryRaw`
      SELECT COUNT(*) + 1 AS rank
      FROM users
      WHERE COALESCE(points, 0) > ${userPoints}
    `;

    // Jika pengguna berada di leaderboard, gunakan indeks + 1 sebagai peringkat
    let userRank = (rankResult as any)[0]?.rank || 1;
    
    // Cek apakah pengguna berada di leaderboard, jika ya, gunakan indeks aktual mereka
    const userInLeaderboard = Array.isArray(leaderboard) && 
      leaderboard.findIndex((user: any) => user.id === currentUser.id);
    
    if (userInLeaderboard !== -1 && userInLeaderboard !== undefined) {
      userRank = userInLeaderboard + 1; // indeks dimulai dari 0
    }

    return { 
      leaderboard,
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        points: userPoints,
        level: userLevel,
        rank: userRank
      }
    }
  } catch (error) {
    console.error("Error getting points leaderboard:", error)
    return { error: "Terjadi kesalahan saat mengambil leaderboard" }
  }
} 