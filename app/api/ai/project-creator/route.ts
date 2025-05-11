import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// Inisialisasi client Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Anda harus login untuk menggunakan fitur ini" },
        { status: 401 }
      )
    }

    // Dapatkan user saat ini
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      )
    }

    // Parse body request
    const body = await req.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      )
    }

    // Instruksi untuk model Gemini
    const systemPrompt = `Kamu adalah asisten AI yang membantu membuat project, task, dan tim berdasarkan deskripsi yang diberikan pengguna. 
    Tugas kamu adalah mengekstrak detail berikut dari prompt pengguna:
    1. Nama project
    2. Deskripsi project
    3. Tim (jumlah dan role/peran dalam tim)
    4. Task-task (WAJIB buat minimal 15-20 task detail dengan nama, deskripsi, dan durasi)
    5. Tanggal mulai dan target selesai

    Berikan respons dalam format JSON seperti contoh berikut:
    {
      "project": {
        "name": "Website E-commerce Toko Sepatu",
        "description": "Membuat website e-commerce untuk toko sepatu dengan fitur katalog produk, keranjang belanja, sistem pembayaran online, manajemen inventaris, dan analytics",
        "startDate": "2023-05-01", 
        "endDate": "2023-08-30"
      },
      "team": [
        { "role": "MEMBER", "name": "UI/UX Designer" },
        { "role": "MEMBER", "name": "Frontend Developer" },
        { "role": "MEMBER", "name": "Backend Developer" },
        { "role": "MEMBER", "name": "Database Administrator" },
        { "role": "MEMBER", "name": "QA Tester" },
        { "role": "MEMBER", "name": "Project Manager" },
        { "role": "MEMBER", "name": "DevOps Engineer" }
      ],
      "tasks": [
        {
          "name": "Analisis Kebutuhan Bisnis",
          "description": "Melakukan wawancara dengan stakeholder untuk menentukan kebutuhan dan fitur utama website e-commerce",
          "startDate": "2023-05-01",
          "endDate": "2023-05-07",
          "status": "Not Started"
        },
        {
          "name": "Riset Kompetitor",
          "description": "Menganalisis website pesaing untuk mengidentifikasi best practices dan peluang diferensiasi",
          "startDate": "2023-05-05",
          "endDate": "2023-05-12",
          "status": "Not Started"
        },
        {
          "name": "Wireframing Halaman Utama",
          "description": "Membuat wireframe low-fidelity untuk halaman beranda dan navigasi utama",
          "startDate": "2023-05-10",
          "endDate": "2023-05-17",
          "status": "Not Started"
        },
        {
          "name": "Wireframing Halaman Produk",
          "description": "Membuat wireframe untuk halaman detail produk, kategori, dan pencarian",
          "startDate": "2023-05-15",
          "endDate": "2023-05-22",
          "status": "Not Started"
        },
        {
          "name": "Wireframing Checkout Flow",
          "description": "Membuat wireframe untuk alur checkout, keranjang belanja, dan pembayaran",
          "startDate": "2023-05-18",
          "endDate": "2023-05-25",
          "status": "Not Started"
        },
        {
          "name": "Design UI Halaman Utama",
          "description": "Membuat desain visual high-fidelity untuk halaman beranda berdasarkan wireframe",
          "startDate": "2023-05-23",
          "endDate": "2023-06-01",
          "status": "Not Started"
        },
        {
          "name": "Design UI Halaman Produk",
          "description": "Membuat desain visual untuk halaman produk dan katalog",
          "startDate": "2023-05-28",
          "endDate": "2023-06-05",
          "status": "Not Started"
        },
        {
          "name": "Design UI Checkout & Keranjang",
          "description": "Membuat desain visual untuk proses checkout dan keranjang belanja",
          "startDate": "2023-06-01",
          "endDate": "2023-06-08",
          "status": "Not Started"
        },
        {
          "name": "Design UI Panel Admin",
          "description": "Membuat desain visual untuk dashboard admin dan management produk",
          "startDate": "2023-06-05",
          "endDate": "2023-06-15",
          "status": "Not Started"
        },
        {
          "name": "Perancangan Database",
          "description": "Mendesain skema database untuk produk, pengguna, pesanan, dan inventaris",
          "startDate": "2023-05-15",
          "endDate": "2023-05-25",
          "status": "Not Started"
        },
        {
          "name": "Setup Infrastruktur",
          "description": "Menyiapkan server, domain, dan lingkungan development",
          "startDate": "2023-05-20",
          "endDate": "2023-05-30",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Frontend - Homepage",
          "description": "Mengembangkan halaman beranda dan navigasi dengan HTML, CSS dan JavaScript",
          "startDate": "2023-06-10",
          "endDate": "2023-06-20",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Frontend - Katalog Produk",
          "description": "Mengembangkan halaman katalog dan filter produk",
          "startDate": "2023-06-15",
          "endDate": "2023-06-25",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Frontend - Detail Produk",
          "description": "Mengembangkan halaman detail produk dengan galeri gambar dan deskripsi",
          "startDate": "2023-06-20",
          "endDate": "2023-06-30",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Frontend - Keranjang & Checkout",
          "description": "Mengembangkan fitur keranjang belanja dan proses checkout",
          "startDate": "2023-06-25",
          "endDate": "2023-07-05",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Backend - API Produk",
          "description": "Mengembangkan RESTful API untuk manajemen produk dan kategori",
          "startDate": "2023-06-01",
          "endDate": "2023-06-15",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Backend - API Pengguna",
          "description": "Mengembangkan sistem autentikasi dan manajemen pengguna",
          "startDate": "2023-06-10",
          "endDate": "2023-06-25",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Backend - API Pesanan",
          "description": "Mengembangkan sistem pemrosesan pesanan dan pembayaran",
          "startDate": "2023-06-20",
          "endDate": "2023-07-05",
          "status": "Not Started"
        },
        {
          "name": "Implementasi Backend - Admin Panel",
          "description": "Mengembangkan panel admin untuk manajemen produk dan pesanan",
          "startDate": "2023-07-01",
          "endDate": "2023-07-15",
          "status": "Not Started"
        },
        {
          "name": "Integrasi Payment Gateway",
          "description": "Mengintegrasikan sistem pembayaran online seperti Midtrans atau Xendit",
          "startDate": "2023-07-10",
          "endDate": "2023-07-20",
          "status": "Not Started"
        },
        {
          "name": "Unit Testing",
          "description": "Menulis dan menjalankan unit test untuk frontend dan backend",
          "startDate": "2023-07-15",
          "endDate": "2023-07-30",
          "status": "Not Started"
        },
        {
          "name": "Integration Testing",
          "description": "Pengujian integrasi antar komponen sistem",
          "startDate": "2023-07-25",
          "endDate": "2023-08-05",
          "status": "Not Started"
        },
        {
          "name": "User Acceptance Testing",
          "description": "Pengujian dengan pengguna akhir untuk memastikan semua fitur berfungsi sesuai kebutuhan",
          "startDate": "2023-08-01",
          "endDate": "2023-08-10",
          "status": "Not Started"
        },
        {
          "name": "Optimasi Performa",
          "description": "Meningkatkan kecepatan loading dan responsivitas website",
          "startDate": "2023-08-05",
          "endDate": "2023-08-15",
          "status": "Not Started"
        },
        {
          "name": "Deployment ke Production",
          "description": "Meluncurkan website ke server produksi",
          "startDate": "2023-08-15",
          "endDate": "2023-08-20",
          "status": "Not Started"
        },
        {
          "name": "Monitoring & Bug Fixing",
          "description": "Memantau kinerja website dan memperbaiki bug yang ditemukan",
          "startDate": "2023-08-20",
          "endDate": "2023-08-30",
          "status": "Not Started"
        }
      ]
    }
    
    Catatan:
    - Tanggal gunakan format ISO (YYYY-MM-DD)
    - Status task bisa: "Not Started", "In Progress", "Completed"
    - Untuk team member, gunakan nama role/posisi yang sesuai dengan project
    - Role team member bisa: "OWNER", "ADMIN", "MEMBER"
    - WAJIB buat minimal 15-20 task yang mencakup seluruh fase project dari awal hingga selesai
    - Task harus detail, spesifik, dan menyeluruh mencakup semua aspek project
    - Task harus mencakup fase: analisis, perencanaan, desain, pengembangan, pengujian, deployment, dan pemeliharaan
    - Pastikan timeline task realistis dan mempertimbangkan dependensi antar task

    PENTING: Berikan output hanya dalam format JSON yang valid tanpa komentar atau teks tambahan.`;

    // Gunakan Gemini untuk menganalisis prompt
    const result = await model.generateContent({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\nPrompt pengguna: ${prompt}\n\nBerikan output JSON:` }]
      }]
    });
    const response = await result.response;
    const textResult = response.text();
    
    // Ekstrak JSON dari hasil (Gemini mungkin mengembalikan teks tambahan)
    let jsonMatch;
    try {
      // Coba parse langsung jika hasil adalah JSON murni
      const aiResponse = JSON.parse(textResult);
      return await processAIResponse(aiResponse, user);
    } catch (jsonError) {
      // Jika tidak bisa parse langsung, coba ekstrak JSON dengan regex
      jsonMatch = textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return await processAIResponse(JSON.parse(jsonMatch[0]), user);
        } catch (extractError) {
          throw new Error("Gagal memproses respons JSON dari AI: " + extractError.message);
        }
      } else {
        throw new Error("Tidak dapat mengekstrak respons JSON dari AI");
      }
    }
  } catch (error: any) {
    console.error("Error creating project from AI:", error)
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat membuat project" },
      { status: 500 }
    )
  }
}

// Fungsi helper untuk memproses respons AI
async function processAIResponse(aiResponse: any, user: any) {
  // Validasi - pastikan ada minimal satu task
  if (!aiResponse.tasks || aiResponse.tasks.length < 10) {
    // Buat task default jika tidak ada task yang dibuat oleh AI atau jumlahnya kurang dari 10
    const defaultTasks = [
      {
        name: "Analisis Kebutuhan",
        description: "Mengidentifikasi dan mendokumentasikan kebutuhan project",
        startDate: aiResponse.project.startDate || new Date().toISOString().split('T')[0],
        endDate: addDays(aiResponse.project.startDate, 7) || addDays(new Date().toISOString().split('T')[0], 7),
        status: "Not Started"
      },
      {
        name: "Perancangan Arsitektur",
        description: "Merancang arsitektur sistem dan alur kerja",
        startDate: addDays(aiResponse.project.startDate, 5) || addDays(new Date().toISOString().split('T')[0], 5),
        endDate: addDays(aiResponse.project.startDate, 14) || addDays(new Date().toISOString().split('T')[0], 14),
        status: "Not Started"
      },
      {
        name: "Desain Antarmuka",
        description: "Membuat desain UI/UX untuk semua halaman utama",
        startDate: addDays(aiResponse.project.startDate, 10) || addDays(new Date().toISOString().split('T')[0], 10),
        endDate: addDays(aiResponse.project.startDate, 20) || addDays(new Date().toISOString().split('T')[0], 20),
        status: "Not Started"
      },
      {
        name: "Pengembangan Frontend - Core Features",
        description: "Mengimplementasikan komponen dan fitur utama frontend",
        startDate: addDays(aiResponse.project.startDate, 15) || addDays(new Date().toISOString().split('T')[0], 15),
        endDate: addDays(aiResponse.project.startDate, 30) || addDays(new Date().toISOString().split('T')[0], 30),
        status: "Not Started"
      },
      {
        name: "Pengembangan Backend - API",
        description: "Mengembangkan API dan logika bisnis utama",
        startDate: addDays(aiResponse.project.startDate, 15) || addDays(new Date().toISOString().split('T')[0], 15),
        endDate: addDays(aiResponse.project.startDate, 35) || addDays(new Date().toISOString().split('T')[0], 35),
        status: "Not Started"
      },
      {
        name: "Integrasi Database",
        description: "Mengintegrasikan dan mengoptimalkan database",
        startDate: addDays(aiResponse.project.startDate, 20) || addDays(new Date().toISOString().split('T')[0], 20),
        endDate: addDays(aiResponse.project.startDate, 30) || addDays(new Date().toISOString().split('T')[0], 30),
        status: "Not Started"
      },
      {
        name: "Integrasi Sistem",
        description: "Mengintegrasikan frontend dan backend",
        startDate: addDays(aiResponse.project.startDate, 30) || addDays(new Date().toISOString().split('T')[0], 30),
        endDate: addDays(aiResponse.project.startDate, 40) || addDays(new Date().toISOString().split('T')[0], 40),
        status: "Not Started"
      },
      {
        name: "Pengujian Fungsional",
        description: "Melakukan pengujian untuk semua fitur sistem",
        startDate: addDays(aiResponse.project.startDate, 35) || addDays(new Date().toISOString().split('T')[0], 35),
        endDate: addDays(aiResponse.project.startDate, 45) || addDays(new Date().toISOString().split('T')[0], 45),
        status: "Not Started"
      },
      {
        name: "Optimasi Performa",
        description: "Meningkatkan kecepatan dan performa aplikasi",
        startDate: addDays(aiResponse.project.startDate, 40) || addDays(new Date().toISOString().split('T')[0], 40),
        endDate: addDays(aiResponse.project.startDate, 47) || addDays(new Date().toISOString().split('T')[0], 47),
        status: "Not Started"
      },
      {
        name: "Deployment",
        description: "Menerapkan aplikasi ke lingkungan produksi",
        startDate: addDays(aiResponse.project.startDate, 47) || addDays(new Date().toISOString().split('T')[0], 47),
        endDate: aiResponse.project.endDate || addDays(new Date().toISOString().split('T')[0], 50),
        status: "Not Started"
      }
    ];
    
    // Jika ada task dari AI tapi jumlahnya kurang dari 10, gabungkan dengan default tasks hingga minimal 10 task
    if (aiResponse.tasks && aiResponse.tasks.length > 0) {
      aiResponse.tasks = [...aiResponse.tasks, ...defaultTasks.slice(0, 10 - aiResponse.tasks.length)];
    } else {
      aiResponse.tasks = defaultTasks;
    }
  }

  // Helper function untuk menambahkan hari ke tanggal
  function addDays(dateString: string | undefined, days: number): string {
    const date = dateString ? new Date(dateString) : new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // Membuat project baru di database
  const team = await db.team.create({
    data: {
      name: `${aiResponse.project.name} Team`,
      ownerId: user.id,
      members: {
        create: [
          // Owner (project creator)
          {
            userId: user.id,
            role: "OWNER",
          }
        ],
      }
    }
  });
  
  // Array untuk menyimpan semua anggota tim
  const teamMembers = [
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "OWNER"
    }
  ];
  
  // Tambahkan team member dari hasil AI
  if (aiResponse.team && aiResponse.team.length > 0) {
    for (const member of aiResponse.team) {
      // Cek jika email diberikan, tambahkan user yang sudah ada
      if (member.email) {
        const existingUser = await db.user.findUnique({
          where: { email: member.email }
        });
        
        if (existingUser) {
          await db.teamMember.create({
            data: {
              teamId: team.id,
              userId: existingUser.id,
              role: member.role || "MEMBER"
            }
          });
          
          teamMembers.push({
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: member.role || "MEMBER"
          });
        } else {
          // Tambahkan member yang tidak ada di database ke response (untuk display only)
          teamMembers.push({
            id: null,
            name: member.name || "Pengguna Baru",
            email: member.email,
            role: member.role || "MEMBER"
          });
        }
      } else if (member.name) {
        // Tambahkan member yang hanya memiliki nama ke response (untuk display only)
        teamMembers.push({
          id: null,
          name: member.name,
          email: null,
          role: member.role || "MEMBER"
        });
      }
    }
  }
  
  // Buat project baru
  const project = await db.project.create({
    data: {
      name: aiResponse.project.name,
      description: aiResponse.project.description || "",
      startDate: aiResponse.project.startDate ? new Date(aiResponse.project.startDate) : new Date(),
      endDate: aiResponse.project.endDate ? new Date(aiResponse.project.endDate) : null,
      status: "Not Started",
      progress: 0,
      createdById: user.id,
      teamId: team.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER"
        }
      }
    }
  });
  
  // Buat task-task
  const tasks = [];
  if (aiResponse.tasks && aiResponse.tasks.length > 0) {
    for (const taskData of aiResponse.tasks) {
      // Memastikan bahwa field pointsValue ada dengan nilai default jika tidak disediakan
      const task = await db.task.create({
        data: {
          projectId: project.id,
          name: taskData.name,
          description: taskData.description || "",
          startDate: taskData.startDate ? new Date(taskData.startDate) : new Date(),
          endDate: taskData.endDate ? new Date(taskData.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // default 1 minggu
          status: taskData.status || "Not Started",
          progress: 0,
          // Hapus field createdById yang tidak ada di model database
          // Jika diperlukan, gunakan assigneeId untuk menentukan user yang ditugaskan untuk task ini
          assigneeId: user.id, // Opsional: Tetapkan creator juga sebagai assignee
          pointsValue: 10 // Gunakan default nilai points
        }
      });
      
      tasks.push(task);
    }
  }
  
  // Kirim respons sukses
  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status
    },
    team: teamMembers, // Mengembalikan array anggota tim, bukan hanya ID
    teamId: team.id,   // Tetap menyertakan ID tim jika diperlukan
    tasks: tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
      pointsValue: task.pointsValue,
      assigneeId: task.assigneeId,
      editable: true   // Menambahkan flag editable untuk UI
    }))
  });
} 