import Link from "next/link"
import { ArrowRight, Calendar, CheckCircle, Clock, Users, Star, Brain, ChevronRight, BarChart, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
          <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <Badge className="w-fit" variant="outline">Versi 1.0 Baru Dirilis</Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
                    Perencanaan Proyek Cerdas Jadi Lebih Mudah
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Secara otomatis menyesuaikan timeline ketika tugas berubah. Jaga proyek Anda tetap pada jalurnya dengan manajemen dependensi yang cerdas.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row pt-2">
                  <Link href="/register">
                    <Button size="lg" className="gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
                      Mulai Sekarang
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-all">
                      Lihat Demo
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-full overflow-hidden rounded-xl border bg-background p-2 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
                  <div className="relative h-full w-full rounded-lg bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-lg font-semibold">Proyek Redesain Website</div>
                      <div className="text-sm text-muted-foreground">Mei 2024 - Agustus 2024</div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: "Riset & Perencanaan", progress: 100, start: "1 Mei", end: "15 Mei" },
                        { name: "Fase Desain", progress: 75, start: "16 Mei", end: "15 Juni" },
                        { name: "Pengembangan", progress: 30, start: "16 Juni", end: "30 Juli" },
                        { name: "Pengujian", progress: 0, start: "20 Juli", end: "10 Agustus" },
                        { name: "Deployment", progress: 0, start: "11 Agustus", end: "20 Agustus" },
                      ].map((task, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{task.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.start} - {task.end}
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div 
                              className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out" 
                              style={{ width: `${task.progress}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 bg-muted/20">
          <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <div className="flex flex-col items-center justify-center p-6 hover:bg-muted/30 rounded-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-5xl md:text-6xl font-bold text-primary mb-2">1000+</span>
                <span className="text-base md:text-lg text-muted-foreground text-center font-medium">Proyek Dikelola</span>
              </div>
              <div className="flex flex-col items-center justify-center p-6 hover:bg-muted/30 rounded-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-5xl md:text-6xl font-bold text-primary mb-2">85%</span>
                <span className="text-base md:text-lg text-muted-foreground text-center font-medium">Peningkatan Efisiensi</span>
              </div>
              <div className="flex flex-col items-center justify-center p-6 hover:bg-muted/30 rounded-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-5xl md:text-6xl font-bold text-primary mb-2">99.9%</span>
                <span className="text-base md:text-lg text-muted-foreground text-center font-medium">Uptime</span>
              </div>
              <div className="flex flex-col items-center justify-center p-6 hover:bg-muted/30 rounded-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-5xl md:text-6xl font-bold text-primary mb-2">24/7</span>
                <span className="text-base md:text-lg text-muted-foreground text-center font-medium">Dukungan Teknis</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full bg-background py-12 md:py-24 lg:py-32">
          <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
              <Badge variant="outline" className="mb-2">Fitur Unggulan</Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Fitur Powerful</h2>
              <p className="max-w-[85%] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Semua yang Anda butuhkan untuk mengelola proyek kompleks dengan mudah
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Gantt Chart Dinamis</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Timeline visual yang secara otomatis menyesuaikan ketika tugas berubah, menjaga proyek Anda tetap pada jalurnya.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Dependensi Tugas</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Tetapkan dependensi antar tugas sehingga tugas terkait secara otomatis menyesuaikan ketika terjadi perubahan.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Pelacakan Progres</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Indikator visual menunjukkan progres tugas dengan pelacakan status dan pelaporan yang detail.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Mode Kolaborasi</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Bekerja bersama secara real-time dengan anggota tim, dengan izin berbasis peran dan pelacakan aktivitas.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Analisis Jalur Kritis</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Secara otomatis mengidentifikasi jalur kritis dalam proyek Anda untuk fokus pada tugas yang berdampak pada tenggat waktu.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 shadow-sm hover:shadow-md transition-all">
                <div className="rounded-full bg-primary/10 p-3">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Manajemen Sumber Daya</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Alokasikan dan lacak sumber daya di semua tugas untuk mencegah kelebihan alokasi dan mengoptimalkan beban kerja.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-12">
              <Badge variant="outline" className="mb-2">Testimoni</Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Apa Kata Pengguna Kami</h2>
              <p className="text-muted-foreground">
                Ribuan manajer proyek menggunakan Smart Project Planner untuk meningkatkan efisiensi tim mereka
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border border-border/40 bg-background/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mb-4 text-muted-foreground italic">
                    "Smart Project Planner telah mengubah cara tim kami mengelola proyek. Kami dapat dengan mudah melacak dependensi dan progres setiap tugas."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">AS</span>
                    </div>
                    <div>
                      <p className="font-medium">Andi Sutrisno</p>
                      <p className="text-sm text-muted-foreground">Project Manager, Teknologi Maju</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-border/40 bg-background/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mb-4 text-muted-foreground italic">
                    "Visualisasi Gantt Chart membantu kami memahami timeline proyek dengan lebih baik. Fitur deteksi blocker juga sangat membantu."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">DP</span>
                    </div>
                    <div>
                      <p className="font-medium">Dewi Putri</p>
                      <p className="text-sm text-muted-foreground">Team Lead, Kreasi Digital</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-border/40 bg-background/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mb-4 text-muted-foreground italic">
                    "Kemampuan kolaborasi tim dalam aplikasi ini luar biasa. Kami bisa bekerja bersama secara efisien meskipun tim kami tersebar di berbagai lokasi."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">BR</span>
                    </div>
                    <div>
                      <p className="font-medium">Budi Rahardjo</p>
                      <p className="text-sm text-muted-foreground">CTO, Solusi Teknologi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 bg-primary text-primary-foreground">
          <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Siap Memulai Dengan Smart Project Planner?
              </h2>
              <p className="max-w-[600px] text-primary-foreground/90 md:text-xl">
                Bergabunglah dengan ribuan manajer proyek yang telah meningkatkan efisiensi tim mereka
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="gap-1.5 font-semibold">
                    Mulai Gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                    Hubungi Kami
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-8">
        <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Smart Project Planner</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Solusi manajemen proyek cerdas untuk tim modern.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Produk</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Fitur
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Harga
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Perusahaan</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Karir
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Bantuan</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Kontak
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Dokumentasi
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t">
            <p className="text-center text-sm text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} Smart Project Planner. Semua hak dilindungi.
            </p>
            <div className="flex gap-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Syarat & Ketentuan
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Kebijakan Privasi
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
