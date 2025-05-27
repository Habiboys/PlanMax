"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createRisk, updateRisk } from "@/app/actions/project-actions"

// Skema validasi form menggunakan Zod
const formSchema = z.object({
  name: z.string().min(1, { message: "Nama risiko wajib diisi" }),
  description: z.string().nullable(),
  impact: z.string().min(1, { message: "Dampak risiko wajib dipilih" }),
  probability: z.string().min(1, { message: "Probabilitas risiko wajib dipilih" }),
  mitigation: z.string().nullable(),
  status: z.string().min(1, { message: "Status risiko wajib dipilih" }),
})

type FormValues = z.infer<typeof formSchema>

interface RiskFormProps {
  projectId: number
  risk?: {
    id: number
    name: string
    description: string | null
    impact: string
    probability: string
    mitigation: string | null
    status: string
    projectId: number
    createdAt: Date
    updatedAt: Date
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function RiskForm({ projectId, risk, onSuccess, onCancel }: RiskFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inisialisasi form dengan react-hook-form dan Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: risk?.name || "",
      description: risk?.description || "",
      impact: risk?.impact || "",
      probability: risk?.probability || "",
      mitigation: risk?.mitigation || "",
      status: risk?.status || "Identified",
    },
  })

  // Handler submit form
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      let result
      
      if (risk) {
        // Update risiko yang sudah ada
        result = await updateRisk(risk.id, values)
      } else {
        // Buat risiko baru
        result = await createRisk({
          projectId,
          ...values
        })
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
          description: risk ? "Risiko berhasil diperbarui" : "Risiko baru berhasil ditambahkan",
        })
        
        if (onSuccess) {
          onSuccess()
        }
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Risiko</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama risiko" {...field} />
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
                  placeholder="Jelaskan risiko secara detail" 
                  className="min-h-24" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Jelaskan risiko dan potensi dampaknya terhadap proyek
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="impact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dampak</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dampak risiko" />
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
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probabilitas</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih probabilitas risiko" />
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
        </div>

        <FormField
          control={form.control}
          name="mitigation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategi Mitigasi</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Rencana untuk mengatasi risiko" 
                  className="min-h-24" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Jelaskan bagaimana risiko ini akan dicegah atau ditangani
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status risiko" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Identified">Teridentifikasi</SelectItem>
                  <SelectItem value="Analyzed">Dianalisis</SelectItem>
                  <SelectItem value="Monitored">Dimonitor</SelectItem>
                  <SelectItem value="Resolved">Teratasi</SelectItem>
                  <SelectItem value="Closed">Ditutup</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : risk ? "Update Risiko" : "Tambah Risiko"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 