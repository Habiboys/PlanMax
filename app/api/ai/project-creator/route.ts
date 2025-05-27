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
    const { prompt, startDate, endDate } = body

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Tanggal mulai dan selesai harus diisi" },
        { status: 400 }
      )
    }

    // Instruksi untuk model Gemini
    const systemPrompt = `Kamu adalah asisten AI yang membantu membuat project, task, tim, dan risiko berdasarkan deskripsi yang diberikan pengguna. 
    Tugas kamu adalah mengekstrak detail berikut dari prompt pengguna:
    1. Nama project
    2. Deskripsi project
    3. Tim (jumlah dan role/peran dalam tim)
    4. Task-task (WAJIB buat minimal 15-20 task detail dengan nama, deskripsi, durasi, prioritas, tipe, dan estimasi jam)
    5. Tanggal mulai dan target selesai
    6. Risiko-risiko project (WAJIB buat minimal 5 risiko dengan detail lengkap)

    PENTING: Gunakan tanggal mulai ${startDate} dan tanggal selesai ${endDate} yang sudah ditentukan user untuk membuat timeline task yang sesuai.
    Pastikan semua task berada dalam rentang tanggal tersebut.

    Berikan respons dalam format JSON seperti contoh berikut:
    {
      "project": {
        "name": "Website E-commerce Toko Sepatu",
        "description": "Membuat website e-commerce untuk toko sepatu dengan fitur katalog produk, keranjang belanja, sistem pembayaran online, manajemen inventaris, dan analytics",
        "startDate": "${startDate}", 
        "endDate": "${endDate}"
      },
      "team": [
        { "role": "MEMBER", "name": "UI/UX Designer" },
        { "role": "MEMBER", "name": "Frontend Developer" },
        { "role": "MEMBER", "name": "Backend Developer" }
      ],
      "tasks": [
        {
          "name": "Analisis Kebutuhan Bisnis",
          "description": "Melakukan wawancara dengan stakeholder untuk menentukan kebutuhan dan fitur utama website e-commerce",
          "startDate": "${startDate}",
          "endDate": "2023-05-07",
          "status": "Not Started",
          "priority": "High",
          "type": "Analysis",
          "estimatedHours": 20
        }
      ],
      "risks": [
        {
          "name": "Keterlambatan Jadwal",
          "description": "Risiko proyek tidak selesai sesuai dengan timeline yang direncanakan",
          "impact": "High",
          "probability": "Medium",
          "mitigation": "1. Monitoring progress secara rutin\\n2. Identifikasi bottleneck sejak dini\\n3. Alokasi buffer time untuk task-task kritis",
          "status": "Identified"
        }
      ]
    }
    
    Catatan:
    - Tanggal gunakan format ISO (YYYY-MM-DD)
    - Status task bisa: "Not Started", "In Progress", "Completed"
    - Priority task bisa: "High", "Medium", "Low"
    - Type task bisa: "Analysis", "Design", "Development", "Testing", "Documentation", "Research", "Meeting", "Other"
    - estimatedHours harus realistis (dalam jam kerja)
    - Untuk team member, gunakan nama role/posisi yang sesuai dengan project
    - Role team member bisa: "OWNER", "ADMIN", "MEMBER"
    - WAJIB buat minimal 15-20 task yang mencakup seluruh fase project dari awal hingga selesai
    - Task harus detail, spesifik, dan menyeluruh mencakup semua aspek project
    - Task harus mencakup fase: analisis, perencanaan, desain, pengembangan, pengujian, deployment, dan pemeliharaan
    - Pastikan timeline task realistis dan mempertimbangkan dependensi antar task
    - SANGAT PENTING: Semua tanggal task HARUS berada di antara ${startDate} dan ${endDate}

    PENTING: Berikan output hanya dalam format JSON yang valid tanpa komentar atau teks tambahan.
    `;

    // Gunakan Gemini untuk menganalisis prompt
    const result = await model.generateContent([
      `${systemPrompt}\n\nPrompt pengguna: ${prompt}\n\nBerikan output JSON:`
    ]);
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
        if (extractError instanceof Error) {
          throw new Error("Gagal memproses respons JSON dari AI: " + extractError.message);
        } else {
          throw new Error("Gagal memproses respons JSON dari AI");
        }
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

  // Buat risiko-risiko dari AI atau gunakan default jika tidak ada
  const defaultRisks = [
    {
      name: "Keterlambatan Jadwal",
      description: "Risiko proyek tidak selesai sesuai dengan timeline yang direncanakan",
      impact: "High",
      probability: "Medium",
      mitigation: "1. Monitoring progress secara rutin\n2. Identifikasi bottleneck sejak dini\n3. Alokasi buffer time untuk task-task kritis",
      status: "Identified",
      projectId: project.id
    },
    {
      name: "Perubahan Kebutuhan",
      description: "Perubahan requirement yang signifikan selama proyek berjalan",
      impact: "Medium",
      probability: "High",
      mitigation: "1. Dokumentasi requirement yang detail\n2. Komunikasi rutin dengan stakeholder\n3. Proses change management yang jelas",
      status: "Identified",
      projectId: project.id
    },
    {
      name: "Keterbatasan Sumber Daya",
      description: "Kekurangan sumber daya manusia atau teknis selama proyek",
      impact: "High",
      probability: "Medium",
      mitigation: "1. Perencanaan alokasi sumber daya di awal\n2. Identifikasi skill gap\n3. Training dan knowledge sharing",
      status: "Identified",
      projectId: project.id
    },
    {
      name: "Masalah Teknis",
      description: "Kendala teknis yang dapat menghambat pengembangan",
      impact: "Medium",
      probability: "Medium",
      mitigation: "1. Code review rutin\n2. Testing komprehensif\n3. Dokumentasi teknis yang baik",
      status: "Identified",
      projectId: project.id
    },
    {
      name: "Komunikasi Tim",
      description: "Miscommunication atau lack of communication dalam tim",
      impact: "Medium",
      probability: "Low",
      mitigation: "1. Daily standup meeting\n2. Penggunaan tools kolaborasi\n3. Dokumentasi komunikasi penting",
      status: "Identified",
      projectId: project.id
    }
  ];

  // Gunakan risiko dari AI jika ada, jika tidak gunakan default
  const risks = aiResponse.risks && aiResponse.risks.length > 0
    ? aiResponse.risks.map((risk: any) => ({
        ...risk,
        projectId: project.id,
        status: risk.status || "Identified"
      }))
    : defaultRisks;

  // Buat semua risiko
  await db.risk.createMany({
    data: risks
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
          pointsValue: 10, // Gunakan default nilai points
          priority: taskData.priority || "Medium",
          type: taskData.type || "Other",
          estimatedHours: taskData.estimatedHours || 0
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
      editable: true,   // Menambahkan flag editable untuk UI
      priority: task.priority,
      type: task.type,
      estimatedHours: task.estimatedHours
    }))
  });
} 