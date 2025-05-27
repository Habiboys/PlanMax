"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { Task, Prisma } from "@prisma/client"

// Schema for task creation/update
const taskSchema = z.object({
  name: z.string().min(1, "Task name is required").max(255),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string().default("Not Started"),
  priority: z.string().default("Medium"),
  type: z.string().default("Other"),
  estimatedHours: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  dependencies: z.array(z.number()).optional(),
})

// Schema for task update
const taskUpdateSchema = z.object({
  name: z.string().min(1, "Task name is required").max(255),
  description: z.string().nullable(),
  startDate: z.date(),
  endDate: z.date(),
  priority: z.string(),
  type: z.string(),
  estimatedHours: z.number().nullable(),
  assigneeId: z.number().nullable(),
})

type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

// Create a new task
export async function createTask(projectId: number, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to create a task")
  }

  // Parse dependencies from form data
  const dependenciesStr = formData.get("dependencies") as string
  const dependencies = dependenciesStr ? JSON.parse(dependenciesStr) : []

  // Parse assignee ID
  const assigneeIdStr = formData.get("assigneeId") as string
  let assigneeId: number | null = null
  if (assigneeIdStr && assigneeIdStr !== "unassigned") {
    assigneeId = Number.parseInt(assigneeIdStr)
  }

  // Parse estimated hours
  const estimatedHoursStr = formData.get("estimatedHours") as string
  let estimatedHours: number | null = null
  if (estimatedHoursStr) {
    estimatedHours = Number.parseFloat(estimatedHoursStr)
  }

  const validatedFields = taskSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status") || "Not Started",
    priority: formData.get("priority") || "Medium",
    type: formData.get("type") || "Other",
    estimatedHours,
    assigneeId,
    dependencies,
  })

  try {
    // Check if user has permission to create tasks in this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to create tasks in this project")
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        projectId: projectId,
        name: validatedFields.name,
        description: validatedFields.description || "",
        startDate: new Date(validatedFields.startDate),
        endDate: new Date(validatedFields.endDate),
        status: validatedFields.status,
        priority: validatedFields.priority,
        type: validatedFields.type,
        estimatedHours: validatedFields.estimatedHours,
        progress: validatedFields.status === "Completed" ? 100 : 0,
        assigneeId: validatedFields.assigneeId,
      },
    })

    // Add task dependencies if any
    if (validatedFields.dependencies && validatedFields.dependencies.length > 0) {
      const dependencyPromises = validatedFields.dependencies.map((depId) =>
        prisma.taskDependency.create({
          data: {
            taskId: task.id,
            dependsOnTaskId: depId,
          },
        }),
      )

      await Promise.all(dependencyPromises)
    }

    // Create task history entry
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        field: "creation",
        newValue: "Task created",
        changedById: Number.parseInt(session.user.id),
      },
    })

    // If task is assigned, create a notification for the assignee
    if (validatedFields.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: validatedFields.assigneeId,
          type: "task_assignment",
          message: `Anda telah ditugaskan untuk mengerjakan task "${validatedFields.name}" dalam project ini. Silakan periksa detail task untuk informasi lebih lanjut.`,
          relatedId: task.id,
          relatedType: "task",
        },
      })
    }

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true, taskId: task.id }
  } catch (error) {
    console.error("Failed to create task:", error)
    return { success: false, error: "Failed to create task. Please try again." }
  }
}

// Update task
export async function updateTask(projectId: number, taskId: number, data: TaskUpdateInput) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Periksa apakah user memiliki akses ke proyek
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id,
      },
    })

    if (!projectMember) {
      return { error: "Anda tidak memiliki akses ke proyek ini" }
    }

    // Validasi data menggunakan Zod
    const validatedData = taskUpdateSchema.parse(data)

    // Dapatkan task saat ini untuk melacak perubahan
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        priority: true,
        type: true,
        estimatedHours: true,
        assigneeId: true,
      },
    })

    if (!currentTask) {
      return { error: "Task tidak ditemukan" }
    }

    // Update task dengan data yang sudah divalidasi
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        name: validatedData.name,
        description: validatedData.description || "",
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        priority: validatedData.priority,
        type: validatedData.type,
        estimatedHours: validatedData.estimatedHours,
        assigneeId: validatedData.assigneeId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        priority: true,
        type: true,
        estimatedHours: true,
        assigneeId: true,
      },
    })

    // Buat task history entries untuk setiap perubahan
    const historyEntries = []

    if (currentTask.name !== validatedData.name) {
      historyEntries.push({
        taskId: taskId,
        field: "name",
        oldValue: currentTask.name,
        newValue: validatedData.name,
        changedById: user.id,
      })
    }

    if (currentTask.description !== validatedData.description) {
      historyEntries.push({
        taskId: taskId,
        field: "description",
        oldValue: currentTask.description || "",
        newValue: validatedData.description || "",
        changedById: user.id,
      })
    }

    if (currentTask.startDate.toISOString() !== validatedData.startDate.toISOString()) {
      historyEntries.push({
        taskId: taskId,
        field: "startDate",
        oldValue: currentTask.startDate.toISOString(),
        newValue: validatedData.startDate.toISOString(),
        changedById: user.id,
      })
    }

    if (currentTask.endDate.toISOString() !== validatedData.endDate.toISOString()) {
      historyEntries.push({
        taskId: taskId,
        field: "endDate",
        oldValue: currentTask.endDate.toISOString(),
        newValue: validatedData.endDate.toISOString(),
        changedById: user.id,
      })
    }

    if (currentTask.priority !== validatedData.priority) {
      historyEntries.push({
        taskId: taskId,
        field: "priority",
        oldValue: currentTask.priority,
        newValue: validatedData.priority,
        changedById: user.id,
      })
    }

    if (currentTask.type !== validatedData.type) {
      historyEntries.push({
        taskId: taskId,
        field: "type",
        oldValue: currentTask.type,
        newValue: validatedData.type,
        changedById: user.id,
      })
    }

    if (currentTask.estimatedHours !== validatedData.estimatedHours) {
      historyEntries.push({
        taskId: taskId,
        field: "estimatedHours",
        oldValue: currentTask.estimatedHours?.toString() || "None",
        newValue: validatedData.estimatedHours?.toString() || "None",
        changedById: user.id,
      })
    }

    if (currentTask.assigneeId !== validatedData.assigneeId) {
      historyEntries.push({
        taskId: taskId,
        field: "assignee",
        oldValue: currentTask.assigneeId?.toString() || "None",
        newValue: validatedData.assigneeId?.toString() || "None",
        changedById: user.id,
      })

      // Jika task diassign ke user baru, buat notifikasi
      if (validatedData.assigneeId) {
        await prisma.notification.create({
          data: {
            userId: validatedData.assigneeId,
            type: "task_assignment",
            message: `Anda telah ditugaskan untuk mengerjakan task "${validatedData.name}" dalam project ini.`,
            relatedId: taskId,
            relatedType: "task",
          },
        })
      }
    }

    // Buat history entries jika ada perubahan
    if (historyEntries.length > 0) {
      await prisma.taskHistory.createMany({
        data: historyEntries,
      })
    }

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true, task: updatedTask }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Data task tidak valid: " + error.errors.map(e => e.message).join(", ") }
    }
    console.error("Error updating task:", error)
    return { error: "Terjadi kesalahan saat memperbarui task" }
  }
}

// Update task progress
export async function updateTaskProgress(projectId: number, taskId: number, progress: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to update task progress")
  }

  try {
    console.log(`Updating task progress: taskId=${taskId}, progress=${progress}, user=${session.user.email}`);
    
    // Check if user has permission to update tasks in this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to update tasks in this project")
    }

    // Get the current task to track changes
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!currentTask) {
      throw new Error("Task not found")
    }
    
    console.log(`Current task state: id=${taskId}, progress=${currentTask.progress}, status=${currentTask.status}, assigneeId=${currentTask.assigneeId}`);

    // Determine status based on progress
    let status = currentTask.status
    if (progress === 100) {
      status = "Completed"
    } else if (progress > 0) {
      status = "In Progress"
    } else if (progress === 0) {
      status = "Not Started"
    }
    
    console.log(`New status calculation: progress=${progress}, newStatus=${status}, oldStatus=${currentTask.status}`);

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        progress,
        status,
      },
    })
    
    console.log(`Task updated: id=${taskId}, newProgress=${updatedTask.progress}, newStatus=${updatedTask.status}`);

    // Create history entry
    await prisma.taskHistory.create({
      data: {
        taskId: taskId,
        field: "progress",
        oldValue: currentTask.progress.toString(),
        newValue: progress.toString(),
        changedById: Number.parseInt(session.user.id),
      },
    })

    // If status changed, create another history entry
    if (status !== currentTask.status) {
      await prisma.taskHistory.create({
        data: {
          taskId: taskId,
          field: "status",
          oldValue: currentTask.status,
          newValue: status,
          changedById: Number.parseInt(session.user.id),
        },
      })
      
      console.log(`Status history entry created: ${currentTask.status} -> ${status}`);
    }

    // Update project progress
    await updateProjectProgress(projectId)

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to update task progress:", error)
    return { success: false, error: "Failed to update task progress. Please try again." }
  }
}

// Delete a task
export async function deleteTask(projectId: number, taskId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to delete a task")
  }

  try {
    // Check if user has permission to delete tasks in this project
    const projectMember = prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
        role: { in: ["OWNER", "ADMIN"] }, // Only certain roles can delete tasks
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to delete tasks in this project")
    }

    // Delete the task and related records
    await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { taskId: taskId },
          { dependsOnTaskId: taskId },
        ],
      },
    })

    await prisma.taskHistory.deleteMany({
      where: {
        taskId: taskId,
      },
    })

    await prisma.task.delete({
      where: {
        id: taskId,
      },
    })

    // Update project progress
    await updateProjectProgress(projectId)

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to delete task:", error)
    return { success: false, error: "Failed to delete task. Please try again." }
  }
}

// Helper function to update project progress based on tasks
async function updateProjectProgress(projectId: number) {
  try {
    // Get all tasks for the project
    const tasks = await prisma.task.findMany({
      where: { projectId: projectId },
    })

    // Calculate project progress
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === "Completed").length
    const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Ambil info project untuk melihat progress saat ini
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { progress: true }
    });

    // Determine project status based on progress and task status
    let projectStatus = "Not Started"
    
    if (completedTasks === totalTasks && totalTasks > 0) {
      projectStatus = "Completed"
    } else if (completedTasks > 0 || inProgressTasks > 0 || progress > 0 || (project?.progress || 0) > 0) {
      // Project dianggap "In Progress" jika:
      // - Ada task yang selesai ATAU
      // - Ada task yang sedang dikerjakan ATAU
      // - Progress saat ini lebih dari 0
      projectStatus = "In Progress"
    }

    // Update the project progress and status
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        progress,
        status: projectStatus
      },
    })

    console.log("Project status updated:", {
      projectId,
      progress,
      status: projectStatus,
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks
      }
    });

    return { success: true }
  } catch (error) {
    console.error("Failed to update project progress:", error)
    return { success: false, error: "Failed to update project progress" }
  }
}

// Get tasks for a project
export async function getProjectTasks(projectId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to view project tasks")
  }

  try {
    // Check if user has permission to view this project
    const projectMember = prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to view this project")
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: projectId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        dependsOn: {
          include: {
            dependsOnTask: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    })

    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description || "",
        startDate: task.startDate.toISOString(),
        endDate: task.endDate.toISOString(),
        progress: task.progress,
        status: task.status,
        assignee: task.assignee ? task.assignee.name : null,
        assigneeId: task.assigneeId,
        dependencies: task.dependsOn.map((dep) => dep.dependsOnTaskId),
      })),
    }
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return { tasks: [], error: "Failed to fetch tasks. Please try again." }
  }
}

// Update task dates (for ML predicted timeline)
export async function updateTaskDates(
  projectId: number, 
  taskId: number, 
  data: {
    startDate?: string,
    endDate?: string,
    status?: string,
    progress?: number,
    assigneeId?: number | null,
    name?: string,
    description?: string
  }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to update task dates" }
  }

  try {
    // Check if user has permission to update tasks in this project
    const projectMember = prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      return { success: false, error: "You don't have permission to update tasks in this project" }
    }

    // Get the current task 
    const currentTask = prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!currentTask) {
      return { success: false, error: "Task not found" }
    }

    // Build update data with only fields that are provided
    const updateData: any = {}
    
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.status) updateData.status = data.status
    if (data.progress !== undefined) updateData.progress = data.progress
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId
    if (data.name) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description

    // Update the task
    await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    // Create history entry for date change
    let changes = []
    
    if (data.startDate && currentTask.startDate.toISOString() !== new Date(data.startDate).toISOString()) {
      changes.push("tanggal mulai")
      await prisma.taskHistory.create({
        data: {
          taskId: taskId,
          field: "startDate",
          oldValue: currentTask.startDate.toISOString(),
          newValue: new Date(data.startDate).toISOString(),
          changedById: Number.parseInt(session.user.id),
        },
      })
    }
    
    if (data.endDate && currentTask.endDate.toISOString() !== new Date(data.endDate).toISOString()) {
      changes.push("tanggal selesai")
      await prisma.taskHistory.create({
        data: {
          taskId: taskId,
          field: "endDate",
          oldValue: currentTask.endDate.toISOString(),
          newValue: new Date(data.endDate).toISOString(),
          changedById: Number.parseInt(session.user.id),
        },
      })
    }

    // Revalidate the project page to show the updates
    revalidatePath(`/dashboard/${projectId}`)
    
    return { 
      success: true, 
      message: changes.length > 0 
        ? `Berhasil memperbarui ${changes.join(" dan ")} task.` 
        : "Tidak ada perubahan pada task."
    }
  } catch (error) {
    console.error("Failed to update task dates:", error)
    return { success: false, error: "Failed to update task dates. Please try again." }
  }
}

// Update task assignee
export async function updateTaskAssignee(projectId: number, taskId: number, assigneeId: number | null) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { success: false, error: "Anda harus login untuk mengubah penugasan" }
  }

  try {
    // Cek apakah user memiliki izin untuk mengubah task di project ini
    const projectMember = prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      return { success: false, error: "Anda tidak memiliki izin untuk mengubah task di project ini" }
    }

    // Dapatkan informasi project termasuk teamId
    const project = prisma.project.findUnique({
      where: { id: projectId },
      select: { teamId: true }
    });

    if (!project) {
      return { success: false, error: "Project tidak ditemukan" };
    }

    // Dapatkan task saat ini untuk melacak perubahan
    const currentTask = prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!currentTask) {
      return { success: false, error: "Task tidak ditemukan" }
    }

    // Validasi assignee jika tidak null
    if (assigneeId !== null) {
      // Periksa apakah user ada
      const assigneeExists = prisma.user.findUnique({
        where: { id: assigneeId }
      });
      
      if (!assigneeExists) {
        return { success: false, error: 'Assignee tidak valid' };
      }
      
      // Jika project memiliki tim, periksa apakah assignee adalah anggota tim
      if (project.teamId) {
        const isTeamMember = prisma.teamMember.findFirst({
          where: {
            teamId: project.teamId,
            userId: assigneeId
          }
        });
        
        if (!isTeamMember) {
          return { success: false, error: 'Assignee bukan anggota tim project ini' };
        }
      } else {
        // Jika tidak ada tim, periksa apakah assignee adalah anggota project
        const isProjectMember = prisma.projectMember.findFirst({
          where: {
            projectId: projectId,
            userId: assigneeId
          }
        });
        
        if (!isProjectMember) {
          return { success: false, error: 'Assignee bukan anggota project ini' };
        }
      }
    }

    // Update task
    const updatedTask = prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId: assigneeId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Buat task history entry
    await prisma.taskHistory.create({
      data: {
        taskId: taskId,
        field: "assignee",
        oldValue: currentTask.assignee ? currentTask.assignee.name : "Tidak ada",
        newValue: updatedTask.assignee ? updatedTask.assignee.name : "Tidak ada",
        changedById: Number.parseInt(session.user.id),
      },
    })

    // Jika task diassign, buat notifikasi untuk assignee
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: "task_assignment",
          message: `Anda telah ditugaskan untuk mengerjakan task "${currentTask.name}" dalam project ini. Silakan periksa detail task untuk informasi lebih lanjut.`,
          relatedId: taskId,
          relatedType: "task",
        },
      })
    }

    revalidatePath(`/dashboard/${projectId}`)
    return { 
      success: true,
      task: {
        ...updatedTask,
        assignee: updatedTask.assignee ? updatedTask.assignee.name : null
      }
    }
  } catch (error) {
    console.error("Failed to update task assignee:", error)
    return { success: false, error: "Gagal mengubah assignee task. Silakan coba lagi." }
  }
}
