"use client"

import type React from "react"

import { Calendar } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Pastikan password yang Anda masukkan sama.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Registrasi gagal")
      }

      toast({
        title: "Akun berhasil dibuat!",
        description: "Silakan masuk dengan akun Anda.",
      })

      router.push("/login")
    } catch (error) {
      toast({
        title: "Registrasi gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak terduga",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              PlanMax
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Buat akun baru untuk mulai mengelola proyek Anda
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-medium">Nama Depan</Label>
                <Input
                  id="first-name"
                  name="firstName"
                  placeholder="John"
                  className="h-11"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-medium">Nama Belakang</Label>
                <Input
                  id="last-name"
                  name="lastName"
                  placeholder="Doe"
                  className="h-11"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                className="h-11"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                className="h-11"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                className="h-11"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              className="w-full h-11 text-base font-medium" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? "Membuat Akun..." : "Daftar"}
            </Button>
            <div className="text-center text-sm">
              Sudah punya akun?{" "}
              <Link 
                href="/login" 
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Masuk sekarang
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
