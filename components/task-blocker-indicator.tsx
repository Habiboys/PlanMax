"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { BlockerAnalysis, detectBlockers } from "@/lib/ml-api"
import { AlertCircle, AlertTriangle, ServerCrash, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface TaskBlockerIndicatorProps {
  taskId: number
  name: string
  description?: string
  comments?: any[]
  className?: string
}

interface CommentAnalysis {
  commentId: number | string
  content: string
  analysis: BlockerAnalysis
}

interface GroupedComment {
  preview: string
  phrases: string[]
  confidence: number
}

export function TaskBlockerIndicator({
  taskId,
  name,
  description,
  comments = [],
  className = ""
}: TaskBlockerIndicatorProps) {
  const [loading, setLoading] = useState(true)
  const [commentAnalyses, setCommentAnalyses] = useState<CommentAnalysis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [serviceUnavailable, setServiceUnavailable] = useState(false)

  // Fungsi untuk mendapatkan analisis gabungan dari semua komentar
  const getCombinedAnalysis = (): BlockerAnalysis | null => {
    if (commentAnalyses.length === 0) return null;

    // Ambil komentar yang terdeteksi sebagai blocker
    const blockerAnalyses = commentAnalyses.filter(ca => ca.analysis.is_blocker);
    
    if (blockerAnalyses.length === 0) return null;

    // Ambil analisis dengan confidence tertinggi sebagai representasi utama
    const highestConfidence = blockerAnalyses.reduce((prev, current) => 
      prev.analysis.confidence > current.analysis.confidence ? prev : current
    );

    // Kelompokkan frasa per komentar
    const groupedComments = blockerAnalyses.map(analysis => ({
      preview: analysis.content.slice(0, 50) + "...",
      phrases: analysis.analysis.flagged_phrases,
      confidence: analysis.analysis.confidence
    }));

    return {
      is_blocker: true,
      confidence: highestConfidence.analysis.confidence,
      flagged_phrases: blockerAnalyses.flatMap(a => a.analysis.flagged_phrases),
      recommendation: highestConfidence.analysis.recommendation,
      groupedComments // Tambahkan groupedComments ke hasil
    };
  };

  useEffect(() => {
    const analyzeComments = async () => {
      // Jika tidak ada komentar, tidak perlu melakukan analisis
      if (comments.length === 0) {
        setLoading(false)
        setCommentAnalyses([])
        return
      }

      setLoading(true)
      setServiceUnavailable(false)
      try {
        // Analisis setiap komentar secara terpisah
        const analyses = await Promise.all(
          comments.map(async (comment) => {
            try {
              const analysis = await detectBlockers(comment.content);
              return {
                commentId: comment.id,
                content: comment.content,
                analysis
              };
            } catch (err) {
              console.error(`Error analyzing comment ${comment.id}:`, err);
              return null;
            }
          })
        );

        // Filter out null results dan update state
        setCommentAnalyses(analyses.filter((a): a is CommentAnalysis => a !== null));
      } catch (err) {
        console.error("Error analisis blocker:", err)
        
        if (err instanceof Error && err.message.includes("ML service is unavailable")) {
          console.log(`❌ Layanan ML tidak tersedia untuk task ${taskId}`);
          setServiceUnavailable(true)
        } else {
          setError("Tidak dapat menganalisis komentar")
        }
      } finally {
        setLoading(false)
      }
    }

    // Delay análisis sedikit untuk mengurangi beban server saat banyak task dimuat bersamaan
    const timer = setTimeout(() => {
      analyzeComments()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [taskId, comments])

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
            <p>Layanan ML tidak tersedia. Analisis komentar tidak dapat dilakukan.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Render error state
  if (error) {
    return null
  }

  // Dapatkan analisis gabungan
  const analysis = getCombinedAnalysis();
  
  // Jika tidak ada blocker, tidak tampilkan apa-apa
  if (!analysis || !analysis.is_blocker) {
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

  // Helper untuk mendapatkan teks level blocker
  const getBlockerLevel = (confidence: number) => {
    if (confidence >= 0.6) return "Blocker Serius";
    if (confidence >= 0.4) return "Mungkin Blocker";
    return "Potensi Hambatan";
  }

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
          <div className="space-y-3">
            {(analysis as any).groupedComments.map((comment: GroupedComment, i: number) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Pada komentar: "{comment.preview}"
                </p>
                <div className="text-xs">
                  <span className="text-muted-foreground">Frasa: </span>
                  {comment.phrases.map((phrase, j) => (
                    <Badge key={j} variant="secondary" className="mr-1">
                      {phrase}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs italic">
                  {getBlockerLevel(comment.confidence)}
                </p>
              </div>
            ))}
            {analysis.recommendation && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                {analysis.recommendation}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 