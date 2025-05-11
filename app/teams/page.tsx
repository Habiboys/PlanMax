"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createTeam } from "@/app/actions/team-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  name: z.string().min(1, "Nama tim harus diisi"),
  description: z.string().optional(),
})

export default function TeamsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)

    try {
      const result = await createTeam(values.name, values.description || "")

      if (result.success) {
        setOpen(false)
        toast({
          title: "Tim berhasil dibuat",
          description: `Tim "${values.name}" telah berhasil dibuat.`,
        })
        router.refresh()
      } else {
        toast({
          title: "Gagal membuat tim",
          description: result.error || "Terjadi kesalahan saat membuat tim. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Gagal membuat tim",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Tim Saya</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Buat Tim
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Buat Tim Baru</DialogTitle>
                  <DialogDescription>
                    Tambahkan tim baru untuk mengelola project Anda.
                  </DialogDescription>
                </DialogHeader>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tim</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama tim" {...field} />
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
                          placeholder="Masukkan deskripsi tim"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Membuat..." : "Buat Tim"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team list will be added here */}
    </div>
  )
} 