"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Calendar, Check, Loader2, Mail, User, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/app-header"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [firstName, setFirstName] = useState(session?.user?.name?.split(" ")[0] || "")
  const [lastName, setLastName] = useState(session?.user?.name?.split(" ")[1] || "")
  const [email, setEmail] = useState(session?.user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(session?.user?.image || null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [showAvatarOptions, setShowAvatarOptions] = useState(false)

  if (!session?.user) {
    return null // This should not happen due to middleware protection
  }

  // Extract initials from user name for AvatarFallback
  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    return name.split(" ").map(n => n[0]).join("").toUpperCase()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File terlalu besar",
        description: "Ukuran file maksimal adalah 5MB",
        variant: "destructive"
      })
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(file)
    setShowAvatarOptions(true)
  }

  const confirmAvatarChange = async () => {
    if (!imageFile) return
    
    setIsSubmitting(true)
    try {
      // Create a FormData instance
      const formData = new FormData()
      formData.append("avatar", imageFile)
      
      // Upload to server
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData
      })
      
      if (!response.ok) {
        throw new Error("Gagal mengunggah foto profil")
      }
      
      const data = await response.json()
      
      // Update session with new avatar URL
      await updateSession({
        user: {
          ...session.user,
          image: data.avatarUrl
        }
      })
      
      // Perbarui state lokal dan juga set preview image dengan URL baru
      setPreviewImage(data.avatarUrl)
      
      // Force re-render komponen dengan memperbarui DOM
      const avatarElements = document.querySelectorAll('img[alt*="Profile"]')
      avatarElements.forEach(img => {
        if (img instanceof HTMLImageElement) {
          img.src = data.avatarUrl
        }
      })
      
      toast({
        title: "Sukses",
        description: "Foto profil berhasil diperbarui",
      })
      
      // Tidak perlu refresh lagi - akan memperlambat UX
      // router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengunggah foto profil",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
      setShowAvatarOptions(false)
    }
  }

  const cancelAvatarChange = () => {
    setPreviewImage(session?.user?.image || null)
    setImageFile(null)
    setShowAvatarOptions(false)
  }

  const handleProfileUpdate = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Kata sandi baru dan konfirmasi kata sandi tidak cocok",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare the data
      const updatedData = {
        name: `${firstName} ${lastName}`.trim(),
        email,
        ...(newPassword ? { 
          currentPassword, 
          newPassword 
        } : {})
      }
      
      // Send to API
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Gagal memperbarui profil")
      }
      
      // Update the session with new user data
      await updateSession({
        user: {
          ...session.user,
          name: updatedData.name,
          email: updatedData.email
        }
      })
      
      // Clear password fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      toast({
        title: "Sukses",
        description: "Profil berhasil diperbarui",
      })
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui profil",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Profil Anda</CardTitle>
              <CardDescription>Kelola informasi pribadi Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative h-24 w-24">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={previewImage || session.user.image || undefined} 
                      alt={session.user.name || "Profile"} 
                    />
                    <AvatarFallback className="text-3xl font-semibold">
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute bottom-0 right-0 h-7 w-7 rounded-full border-2 border-background"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <User className="h-4 w-4" />
                    <span className="sr-only">Ubah avatar</span>
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageUpload}
                    disabled={isSubmitting}
                  />
                </div>
                
                {showAvatarOptions && (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-green-600"
                      onClick={confirmAvatarChange}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={cancelAvatarChange}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-lg font-medium">{session.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Email:</span>
                  <span className="font-medium">{session.user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Anggota sejak:</span>
                  <span className="font-medium">Mei 2024</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Informasi Akun</CardTitle>
              <CardDescription>Perbarui detail akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Nama depan</Label>
                  <Input 
                    id="first-name" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Nama belakang</Label>
                  <Input 
                    id="last-name" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Separator />
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ubah Kata Sandi</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordReset(!showPasswordReset)}
                  disabled={isSubmitting}
                >
                  {showPasswordReset ? "Batal" : "Ubah Kata Sandi"}
                </Button>
              </div>
              
              {showPasswordReset && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Kata sandi saat ini</Label>
                    <Input 
                      id="current-password" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Kata sandi baru</Label>
                      <Input 
                        id="new-password" 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Konfirmasi kata sandi</Label>
                      <Input 
                        id="confirm-password" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleProfileUpdate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : "Simpan Perubahan"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
