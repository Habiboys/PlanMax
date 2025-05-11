// Database schema types

export interface Project {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  projectId: number
  name: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  assigneeId: number
  createdAt: string
  updatedAt: string
  dependencies?: number[]
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  avatar: string
  createdAt: string
}

export interface Risk {
  id: number
  projectId: number
  name: string
  description: string
  impact: string
  probability: string
  mitigation: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface TaskDependency {
  id: number
  taskId: number
  dependsOnTaskId: number
  createdAt: string
}

export interface ProjectMember {
  id: number
  projectId: number
  userId: number
  role: string
  createdAt: string
}

export interface TaskHistory {
  id: number
  taskId: number
  field: string
  oldValue: string
  newValue: string
  changedBy: number
  changedAt: string
}

export interface Notification {
  id: number
  userId: number
  type: string
  message: string
  read: boolean
  relatedId?: number
  relatedType?: string
  createdAt: string
}
