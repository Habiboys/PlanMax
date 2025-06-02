"use client"


import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { createTask } from "@/app/actions/task-actions"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "Nama task harus diisi"),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  assigneeId: z.string().default("unassigned"),
  dependencies: z.array(z.number()).optional(),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  type: z.enum(["Development", "Testing", "Documentation", "Research", "Meeting", "Other"]).default("Development"),
  estimatedHours: z.number().min(1, "Estimasi waktu minimal 1 jam").default(1),
  team_size: z.enum(["Small", "Medium", "Large"]).optional(),
})

interface NewTaskFormProps {
  projectId: number
  teamMembers: Array<{
    id: number
    name: string
  }>
  tasks: Array<{
    id: number
    name: string
  }>
  onTaskCreated?: (action: string, taskName: string) => void
}

export function NewTaskForm({ projectId, teamMembers, tasks, onTaskCreated }: NewTaskFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([])
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      assigneeId: "unassigned",
      priority: "Medium",
      type: "Development",
      estimatedHours: 1,
      team_size: teamMembers.length <= 3 ? "Small" : teamMembers.length <= 6 ? "Medium" : "Large",
    },
  })

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      // Siapkan data yang akan dikirim
      const taskData = {
        name: values.name,
        description: values.description || "",
        startDate: values.startDate || new Date(),
        endDate: values.endDate || new Date(),
        status: "Not Started",
        priority: values.priority,
        type: values.type,
        team_size: values.team_size || (teamMembers.length <= 3 ? "Small" : teamMembers.length <= 6 ? "Medium" : "Large"),
        estimatedHours: Number(values.estimatedHours),
        dependencies: selectedDependencies,
      }

      console.log("Data yang dikirim:", taskData)

      const result = await createTask(projectId, taskData)

      if (result.success) {
        if (onTaskCreated) {
          onTaskCreated("create", values.name)
        }
        form.reset()
        setSelectedDependencies([])
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal membuat task. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membuat task. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDependency = (taskId: number) => {
    setSelectedDependencies(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId)
      } else {
        return [...prev, taskId]
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Task</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama task" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="Jelaskan detail task" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Mulai</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: id })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Selesai</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: id })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < (form.getValues("startDate") || new Date()) ||
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih assignee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioritas</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih prioritas" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="High">Tinggi</SelectItem>
                    <SelectItem value="Medium">Sedang</SelectItem>
                    <SelectItem value="Low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estimatedHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimasi Waktu (jam)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1"
                  placeholder="Masukkan estimasi waktu dalam jam" 
                  {...field}
                  value={field.value || 1}
                  onChange={e => {
                    const value = parseInt(e.target.value);
                    field.onChange(isNaN(value) || value < 1 ? 1 : value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Minimal 1 jam
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {tasks.length > 0 && (
          <div className="space-y-2">
            <Label>Dependencies</Label>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={selectedDependencies.includes(task.id)}
                    onCheckedChange={() => toggleDependency(task.id)}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {task.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </Form>
  )
}
