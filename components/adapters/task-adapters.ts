// Adapters untuk mengkonversi format data
import { type Task as WorkloadTask } from "@/components/workload-heatmap";
import { type TeamMember } from "@/components/task-list";

/**
 * Adapter untuk mengkonversi data task dari API/database ke format yang diharapkan WorkloadHeatmap
 */
export function adaptTasksForWorkloadHeatmap(tasks: any[]): WorkloadTask[] {
  if (!tasks || !Array.isArray(tasks)) {
    console.warn("Invalid tasks data received:", tasks);
    return [];
  }
  
  console.log("Raw tasks for workload:", tasks);
  
  const validTasks = tasks.filter(task => {
    // Cek apakah task memiliki assigneeId, jika tidak, tidak perlu ditampilkan di heatmap
    if (!task.assigneeId) {
      console.log(`Skipping task ${task.id || 'unknown'} - no assigneeId`);
      return false;
    }
    return true;
  });
  
  console.log(`Found ${validTasks.length} tasks with assignees out of ${tasks.length} total tasks`);
  
  return validTasks.map(task => {
    // Memastikan format tanggal yang benar
    let startDate = task.startDate;
    let endDate = task.endDate;
    
    // Jika tidak valid, lakukan konversi atau gunakan default
    try {
      // Validasi startDate
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        console.warn(`Invalid startDate for task ${task.id}: ${startDate}`);
        startDate = new Date().toISOString(); // Default ke hari ini
      }
      
      // Validasi endDate
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        console.warn(`Invalid endDate for task ${task.id}: ${endDate}`);
        // Default ke 7 hari dari startDate
        const defaultEnd = new Date(startDateObj);
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        endDate = defaultEnd.toISOString();
      }
      
      // Pastikan startDate tidak lebih besar dari endDate
      if (new Date(startDate) > new Date(endDate)) {
        console.warn(`Task ${task.id} has startDate > endDate, fixing...`);
        // Tukar tanggal jika terbalik
        [startDate, endDate] = [endDate, startDate];
      }
      
    } catch (err) {
      console.error(`Error validating dates for task ${task.id}:`, err);
      // Set default dates jika terjadi error
      const today = new Date();
      startDate = today.toISOString();
      const endDay = new Date(today);
      endDay.setDate(today.getDate() + 7);
      endDate = endDay.toISOString();
    }
    
    console.log(`Task ${task.id} - ${task.name} dates: start=${startDate}, end=${endDate}, assigneeId=${task.assigneeId}`);
    
    return {
      id: task.id,
      name: task.name,
      startDate: startDate,
      endDate: endDate,
      assigneeId: task.assigneeId,
      assignee: task.assignee ? {
        id: typeof task.assignee === 'string' ? task.assigneeId || 0 : (task.assignee.id || task.assigneeId || 0),
        name: typeof task.assignee === 'string' ? task.assignee : (task.assignee.name || 'Unknown'),
        avatar: null
      } : {
        // Jika task.assignee tidak ada, buat dummy assignee berdasarkan assigneeId
        id: task.assigneeId || 0,
        name: 'Team Member',
        avatar: null
      }
    };
  });
}

/**
 * Adapter untuk mengkonversi data tim dari API/database ke format yang diharapkan TaskList
 * Menangani berbagai kemungkinan struktur data teamMembers
 */
export function adaptTeamMembersForTaskList(members: any[]): TeamMember[] {
  if (!members || !Array.isArray(members)) {
    console.log("adaptTeamMembersForTaskList: received invalid members data", members);
    return [];
  }
  
  console.log("adaptTeamMembersForTaskList: raw members data", JSON.stringify(members, null, 2));
  
  // Cek apakah data member sudah dalam format yang benar (memiliki id dan name langsung)
  if (members.length > 0 && members[0].id !== undefined && members[0].name !== undefined) {
    console.log("adaptTeamMembersForTaskList: members already in correct format");
    return members as TeamMember[];
  }
  
  // Menangani format dari API team members
  const result = members
    .filter(member => {
      if (!member) return false;
      // Cek berbagai kemungkinan struktur data
      return member.user || member.userId || member.id;
    })
    .map(member => {
      // Debug untuk format member
      console.log("Processing member:", member);
      
      // Jika member langsung memiliki id dan name
      if (member.id && member.name) {
        return {
          id: member.id,
          name: member.name
        };
      }
      
      // Jika member memiliki user object
      if (member.user) {
        return {
          id: member.user.id,
          name: member.user.name || member.user.email || 'Anggota Tim'
        };
      }
      
      // Jika member memiliki userId dan nama user
      if (member.userId && member.userName) {
        return {
          id: member.userId,
          name: member.userName
        };
      }
      
      // Fallback case
      return {
        id: member.userId || member.id || 0,
        name: member.name || member.email || 'Anggota Tim'
      };
    });
  
  console.log("adaptTeamMembersForTaskList: processed members", result);
  return result;
} 