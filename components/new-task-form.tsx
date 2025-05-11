"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createTask } from "@/app/actions/task-actions"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
  name: z.string().min(1, "Nama task harus diisi"),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  assigneeId: z.string().default("unassigned"),
  dependencies: z.array(z.number()).optional(),
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
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([])

  // Log teamMembers saat komponen mounted
  useEffect(() => {
    console.log("NewTaskForm received teamMembers:", teamMembers);
    console.log("TeamMembers length:", teamMembers?.length || 0);
    
    // Tampilkan detail anggota tim untuk debugging
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((member, index) => {
        console.log(`Team member ${index}:`, {
          id: member.id,
          name: member.name,
          type: typeof member.id
        });
      });
    }
  }, [teamMembers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      assigneeId: "unassigned",
      dependencies: [],
    },
  })

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
  
    try {
      const formData = new FormData()
      formData.append("name", values.name)
      formData.append("description", values.description || "")
      
      if (values.assigneeId && values.assigneeId !== "unassigned") {
        formData.append("assigneeId", values.assigneeId)
      }
      
      if (startDate) {
        formData.append("startDate", startDate.toISOString())
      }
  
      if (endDate) {
        formData.append("endDate", endDate.toISOString())
      }
  
      formData.append("dependencies", JSON.stringify(selectedDependencies))
  
      const result = await createTask(projectId, formData)
  
      if (result.success) {
        if (onTaskCreated) {
          onTaskCreated("created", values.name)
        }
        
        form.reset()
        setStartDate(undefined)
        setEndDate(undefined)
        setSelectedDependencies([])
        setOpen(false)
      } else {
        toast({
          title: "Gagal Membuat Task",
          description: result.error || "Terjadi kesalahan saat membuat task. Silakan coba lagi.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      toast({
        title: "Gagal Membuat Task",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDependency = (taskId: number) => {
    setSelectedDependencies((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Task Baru</DialogTitle>
              <DialogDescription>
                Tambahkan task baru ke project Anda. Atur dependencies, assignee, dan deadline.
              </DialogDescription>
            </DialogHeader>

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
                    <Textarea
                      placeholder="Masukkan deskripsi task"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setEndDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih anggota tim" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Belum ditugaskan</SelectItem>
                      {teamMembers && teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <SelectItem 
                            key={`member-${member.id}`} 
                            value={String(member.id)}
                          >
                            {member.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-members" disabled>
                          Tidak ada anggota tim
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Anggota tim yang dipilih akan menerima notifikasi tentang penugasan task ini.
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Membuat..." : "Buat Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
