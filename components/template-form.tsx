"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save, Trash2, ArrowDown, ArrowUp, Grip } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createProjectTemplate, updateProjectTemplate } from "@/app/actions/template-actions"

// Skema validasi form menggunakan Zod
const templateTaskSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Nama tugas wajib diisi" }),
  description: z.string().optional(),
  duration: z.number().min(1, { message: "Durasi tugas minimal 1 hari" }),
  sequence: z.number().min(1),
  dependsOn: z.array(z.number()).optional(),
})

const formSchema = z.object({
  name: z.string().min(1, { message: "Nama template wajib diisi" }),
  description: z.string().optional(),
  tasks: z.array(templateTaskSchema).min(1, { message: "Template harus memiliki minimal 1 tugas" }),
})

type TemplateTask = z.infer<typeof templateTaskSchema>
type FormValues = z.infer<typeof formSchema>

interface TemplateFormProps {
  template?: {
    id: number
    name: string
    description: string
    tasks: {
      id: number
      name: string
      description: string
      duration: number
      sequence: number
      dependsOn: number[]
    }[]
  }
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inisialisasi form dengan react-hook-form dan Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template
      ? {
          name: template.name,
          description: template.description,
          tasks: template.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            description: task.description,
            duration: task.duration,
            sequence: task.sequence,
            dependsOn: task.dependsOn,
          })),
        }
      : {
          name: "",
          description: "",
          tasks: [
            {
              name: "",
              description: "",
              duration: 1,
              sequence: 1,
              dependsOn: [],
            },
          ],
        },
  })

  // Fungsi untuk menambah tugas baru
  const addTask = () => {
    const tasks = form.getValues("tasks")
    form.setValue("tasks", [
      ...tasks,
      {
        name: "",
        description: "",
        duration: 1,
        sequence: tasks.length + 1,
        dependsOn: [],
      },
    ])
  }

  // Fungsi untuk menghapus tugas
  const removeTask = (index: number) => {
    const tasks = form.getValues("tasks")
    
    // Jangan izinkan menghapus jika hanya ada 1 tugas
    if (tasks.length <= 1) {
      toast({
        title: "Peringatan",
        description: "Template harus memiliki minimal 1 tugas",
        variant: "destructive",
      })
      return
    }
    
    // Hapus tugas
    const updatedTasks = tasks.filter((_, i) => i !== index)
    
    // Perbarui sequence
    updatedTasks.forEach((task, i) => {
      task.sequence = i + 1
    })
    
    form.setValue("tasks", updatedTasks)
  }

  // Fungsi untuk memindahkan tugas ke atas
  const moveTaskUp = (index: number) => {
    if (index === 0) return
    
    const tasks = [...form.getValues("tasks")]
    
    // Tukar posisi dengan tugas sebelumnya
    const temp = tasks[index]
    tasks[index] = tasks[index - 1]
    tasks[index - 1] = temp
    
    // Perbarui sequence
    tasks.forEach((task, i) => {
      task.sequence = i + 1
    })
    
    form.setValue("tasks", tasks)
  }

  // Fungsi untuk memindahkan tugas ke bawah
  const moveTaskDown = (index: number) => {
    const tasks = form.getValues("tasks")
    if (index === tasks.length - 1) return
    
    const updatedTasks = [...tasks]
    
    // Tukar posisi dengan tugas berikutnya
    const temp = updatedTasks[index]
    updatedTasks[index] = updatedTasks[index + 1]
    updatedTasks[index + 1] = temp
    
    // Perbarui sequence
    updatedTasks.forEach((task, i) => {
      task.sequence = i + 1
    })
    
    form.setValue("tasks", updatedTasks)
  }

  // Handler submit form
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      let result

      if (template) {
        // Update template yang sudah ada
        result = await updateProjectTemplate(template.id, values)
      } else {
        // Buat template baru
        result = await createProjectTemplate(values)
      }

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sukses",
          description: template
            ? "Template proyek berhasil diperbarui"
            : "Template proyek baru berhasil dibuat",
        })

        // Redirect ke halaman daftar template
        router.push("/dashboard/templates")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Template</FormLabel>
                <FormControl>
                  <Input placeholder="Masukkan nama template" {...field} />
                </FormControl>
                <FormDescription>
                  Nama template yang mudah dikenali untuk referensi di masa mendatang
                </FormDescription>
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
                    placeholder="Jelaskan tujuan dan isi template ini" 
                    className="min-h-24" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Deskripsi singkat tentang template dan jenis proyek yang cocok menggunakannya
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Daftar Tugas</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={addTask}
            >
              <Plus className="h-4 w-4" />
              Tambah Tugas
            </Button>
          </div>

          {form.formState.errors.tasks?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.tasks.message}
            </p>
          )}

          <div className="space-y-4">
            {form.watch("tasks").map((task, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Tugas #{index + 1}
                  </CardTitle>
                  <CardDescription>
                    Isi detail tugas dalam template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Tugas</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nama tugas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi Tugas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Jelaskan tugas secara detail" 
                            className="min-h-20" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durasi (hari)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="Durasi dalam hari" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            value={field.value || 1}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimasi waktu yang dibutuhkan untuk menyelesaikan tugas ini dalam hari
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Dependensi tugas - hanya tampilkan jika ada tugas sebelumnya */}
                  {index > 0 && (
                    <FormField
                      control={form.control}
                      name={`tasks.${index}.dependsOn`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dependensi</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {form.watch("tasks").map((t, i) => {
                              // Hanya tampilkan tugas sebelumnya
                              if (i >= index) return null
                              
                              return (
                                <Button
                                  key={i}
                                  type="button"
                                  size="sm"
                                  variant={field.value?.includes(i + 1) ? "default" : "outline"}
                                  className="gap-1"
                                  onClick={() => {
                                    const dependsOn = [...(field.value || [])]
                                    const taskSeq = i + 1
                                    
                                    if (dependsOn.includes(taskSeq)) {
                                      // Hapus dependensi jika sudah ada
                                      field.onChange(dependsOn.filter(d => d !== taskSeq))
                                    } else {
                                      // Tambahkan dependensi
                                      field.onChange([...dependsOn, taskSeq])
                                    }
                                  }}
                                >
                                  Tugas #{i + 1}
                                </Button>
                              )
                            })}
                          </div>
                          <FormDescription>
                            Pilih tugas yang harus selesai sebelum tugas ini dimulai
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                <CardFooter className="justify-between pt-0">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveTaskUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span className="sr-only">Pindah ke atas</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveTaskDown(index)}
                      disabled={index === form.watch("tasks").length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                      <span className="sr-only">Pindah ke bawah</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeTask(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Hapus</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Grip className="h-4 w-4" />
                    <span>Urutan: {index + 1}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/templates")}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" className="gap-1" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting ? "Menyimpan..." : template ? "Perbarui Template" : "Simpan Template"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 