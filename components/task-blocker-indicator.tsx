"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, XCircle, AlertCircle, CheckCircle, ServerCrash } from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { analyzeTask, BlockerAnalysis } from "@/lib/ml-api"

interface TaskBlockerIndicatorProps {
  taskId: number
  name: string
  description?: string
  comments?: any[]
  className?: string
}

export function TaskBlockerIndicator({ 
  taskId, 
  name, 
  description, 
  comments, 
  className = ""
}: TaskBlockerIndicatorProps) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<BlockerAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serviceUnavailable, setServiceUnavailable] = useState(false)

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true)
      setServiceUnavailable(false)
      try {
        // Tambahkan log untuk melihat permintaan analisis
        console.log(`🔍 Meminta analisis ML untuk task: ${taskId} - ${name}`);
        
        // Format comments untuk API
        const formattedComments = comments?.map(comment => ({
          content: comment.content,
          createdAt: comment.createdAt,
          userId: comment.userId
        })) || []

        const result = await analyzeTask(taskId, name, description, formattedComments)
        
        // Tambahkan log untuk hasil analisis
        console.log(`✅ Hasil analisis ML untuk task ${taskId}:`, result.analysis);
        
        setAnalysis(result.analysis)
      } catch (err) {
        console.error("Error analisis blocker:", err)
        
        // Cek apakah error karena layanan ML tidak tersedia
        if (err instanceof Error && err.message.includes("ML service is unavailable")) {
          console.log(`❌ Layanan ML tidak tersedia untuk task ${taskId}`);
          setServiceUnavailable(true)
        } else {
          setError("Tidak dapat menganalisis task")
        }
      } finally {
        setLoading(false)
      }
    }

    // Delay análisis sedikit untuk mengurangi beban server saat banyak task dimuat bersamaan
    const timer = setTimeout(() => {
      fetchAnalysis()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [taskId, name, description, comments])

  // Render loading state
  if (loading) {
    return (
      <span className={`inline-flex items-center text-gray-400 ${className}`}>
        <AlertCircle className="h-4 w-4 animate-pulse" />
      </span>
    )
  }

  // Render service unavailable state
  if (serviceUnavailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="cursor-help ml-2 gap-1 text-gray-500 border-current"
            >
              <ServerCrash className="h-4 w-4" />
              <span>ML Service</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Layanan ML tidak tersedia. Analisis blocker tidak dapat dilakukan.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Render error state
  if (error || !analysis) {
    return null
  }

  // Jika bukan blocker, tidak tampilkan apa-apa
  if (!analysis.is_blocker) {
    return null
  }

  // Render indikator sesuai confidence level
  const getIndicator = () => {
    if (analysis.confidence >= 0.6) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        text: "Blocker",
        color: "text-red-500"
      }
    } else if (analysis.confidence >= 0.4) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "Mungkin Blocker",
        color: "text-amber-500"
      }
    } else {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: "Potensi Hambatan",
        color: "text-blue-500"
      }
    }
  }

  const indicator = getIndicator()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`cursor-help ml-2 gap-1 ${indicator.color} border-current`}
          >
            {indicator.icon}
            <span>{indicator.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{indicator.text}</p>
            {analysis.flagged_phrases.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Frasa terdeteksi:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.flagged_phrases.map((phrase, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {phrase}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {analysis.recommendation && (
              <p className="text-xs">{analysis.recommendation}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 