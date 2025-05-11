-- Database schema for Smart Project Planner

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  progress INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Not Started',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Not Started',
  assignee_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- Task dependencies table
CREATE TABLE task_dependencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_dependency (task_id, depends_on_task_id)
);

-- Project members table
CREATE TABLE project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_member (project_id, user_id)
);

-- Task history table for tracking changes
CREATE TABLE task_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  field VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Risk management table
CREATE TABLE risks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  impact VARCHAR(50) NOT NULL,
  probability VARCHAR(50) NOT NULL,
  mitigation TEXT,
  status VARCHAR(50) DEFAULT 'Identified',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_id INT,
  related_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Resource allocation table
CREATE TABLE resource_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  hours_allocated DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Project templates table
CREATE TABLE project_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Template tasks table
CREATE TABLE template_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INT NOT NULL, -- Duration in days
  sequence INT NOT NULL, -- Order in the template
  FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
);

-- Template task dependencies
CREATE TABLE template_task_dependencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES template_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES template_tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_template_dependency (task_id, depends_on_task_id)
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_risks_project_id ON risks(project_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_resource_allocations_task_id ON resource_allocations(task_id);
CREATE INDEX idx_resource_allocations_user_id ON resource_allocations(user_id);
