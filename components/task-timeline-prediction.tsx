"use client"

import { useState, useEffect } from "react"
import { CalendarClock, AlertCircle, InfoIcon, ArrowRight, Calendar } from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { format, parseISO, addDays } from "date-fns"
import { id } from "date-fns/locale"
import { predictTaskTimeline, TimelinePrediction, TaskData } from "@/lib/ml-api"

interface TaskTimelinePredictionProps {
  task: TaskData
  historicalTasks?: TaskData[]
  onUpdateTaskDates?: (startDate: string, endDate: string) => void
  className?: string
}

export function TaskTimelinePrediction({ 
  task, 
  historicalTasks = [],
  onUpdateTaskDates,
  className = ""
}: TaskTimelinePredictionProps) {
  const [loading, setLoading] = useState(true)
  const [prediction, setPrediction] = useState<TimelinePrediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serviceUnavailable, setServiceUnavailable] = useState(false)

  useEffect(() => {
    const fetchPrediction = async () => {
      setLoading(true)
      setServiceUnavailable(false)
      try {
        // Logika sederhana untuk mensimulasikan estimasi jam
        if (!task.estimatedHours && task.description) {
          // Estimasi hours berdasarkan kompleksitas deskripsi
          const wordCount = task.description.split(' ').length;
          task.estimatedHours = Math.max(4, Math.ceil(wordCount / 10)); // Asumsi 10 kata per jam, minimum 4 jam
        }
        
        console.log(`🕒 Meminta prediksi timeline untuk task: ${task.id} - ${task.name}`);
        
        const result = await predictTaskTimeline(task, historicalTasks);
        console.log(`✅ Hasil prediksi timeline:`, result);
        
        setPrediction(result);
      } catch (err) {
        console.error("Error prediksi timeline:", err);
        
        if (err instanceof Error && err.message.includes("ML service is unavailable")) {
          console.log(`❌ Layanan ML tidak tersedia untuk prediksi timeline`);
          setServiceUnavailable(true);
        } else {
          setError("Tidak dapat memprediksi timeline");
        }
      } finally {
        setLoading(false);
      }
    };

    // Delay prediksi sedikit untuk mengurangi beban server
    const timer = setTimeout(() => {
      fetchPrediction();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [task, historicalTasks]);

  // Hitung tanggal selesai berdasarkan prediksi
  const predictedEndDate = () => {
    if (!prediction?.predicted_days || !task.startDate) return null;
    
    try {
      const startDate = parseISO(task.startDate);
      const endDate = addDays(startDate, prediction.predicted_days - 1); // -1 karena hari pertama dihitung
      return format(endDate, "dd MMM yyyy", { locale: id });
    } catch (e) {
      return null;
    }
  };

  // Format tanggal
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy", { locale: id });
    } catch (e) {
      return dateString;
    }
  };

  // Hitung selisih hari dari tanggal awal dan akhir task
  const currentDurationDays = () => {
    if (!task.startDate || !task.endDate) return null;
    
    try {
      const startDate = parseISO(task.startDate);
      const endDate = parseISO(task.endDate);
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 untuk menghitung hari pertama
    } catch (e) {
      return null;
    }
  };

  // Handler untuk mengupdate tanggal
  const handleAdjustDates = () => {
    if (!prediction?.predicted_days || !task.startDate || !onUpdateTaskDates) return;
    
    try {
      const startDate = parseISO(task.startDate);
      const newEndDate = addDays(startDate, prediction.predicted_days - 1);
      
      // Format tanggal untuk API
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = newEndDate.toISOString();
      
      onUpdateTaskDates(formattedStartDate, formattedEndDate);
    } catch (e) {
      console.error("Error adjusting dates:", e);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`inline-flex items-center text-gray-400 ${className}`}>
        <CalendarClock className="h-4 w-4 animate-pulse mr-1" />
        <span className="text-xs">Memprediksi timeline...</span>
      </div>
    );
  }

  // Render service unavailable state
  if (serviceUnavailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center text-gray-500 ${className}`}>
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-xs">Prediksi tidak tersedia</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Layanan ML tidak tersedia. Prediksi timeline tidak dapat dilakukan.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render error state
  if (error || !prediction) {
    return null;
  }

  // Tidak ada prediksi
  if (!prediction.predicted_days) {
    return null;
  }

  // Hitung perbedaan antara durasi yang diprediksi dan durasi saat ini
  const currentDuration = currentDurationDays();
  const durationDiff = currentDuration ? prediction.predicted_days - currentDuration : 0;
  const diffText = durationDiff > 0 
    ? `${durationDiff} hari lebih lama dari yang direncanakan` 
    : durationDiff < 0 
      ? `${Math.abs(durationDiff)} hari lebih cepat dari yang direncanakan`
      : `sesuai dengan rencana`;

  // Pilih warna berdasarkan perbedaan durasi
  let colorClass = "text-green-500"; // Default untuk tepat atau lebih cepat
  if (durationDiff > 0) {
    colorClass = durationDiff > 5 ? "text-red-500" : "text-amber-500";
  }

  // Tambahkan class untuk indikator confidence
  const getConfidenceIndicator = () => {
    const confidence = prediction?.confidence || 0;
    if (confidence >= 0.7) return "🟢";  // Confidence tinggi
    if (confidence >= 0.5) return "🟡";  // Confidence medium
    return "🟠";  // Confidence rendah
  };

  return (
    <div className={`${className}`}>
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className={`inline-flex items-center gap-1 cursor-help ${colorClass}`}>
            <CalendarClock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {prediction.predicted_days} hari {getConfidenceIndicator()}
            </span>
            <InfoIcon className="h-3 w-3" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Prediksi Timeline</h4>
            
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimasi durasi:</span>
                <span className="font-medium">{prediction.predicted_days} hari</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tingkat keyakinan:</span>
                <span className="font-medium">{Math.round(prediction.confidence * 100)}%</span>
              </div>
              
              {task.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal mulai:</span>
                  <span className="font-medium">{formatDate(task.startDate)}</span>
                </div>
              )}
              
              {task.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal selesai (direncanakan):</span>
                  <span className="font-medium">{formatDate(task.endDate)}</span>
                </div>
              )}
              
              {predictedEndDate() && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal selesai (prediksi):</span>
                  <span className={`font-medium ${colorClass}`}>{predictedEndDate()}</span>
                </div>
              )}
              
              <div className="pt-2">
                <Badge variant="outline" className={`${colorClass} border-current`}>
                  {diffText}
                </Badge>
              </div>
              
              {prediction.confidence < 0.6 && (
                <div className="pt-2 text-xs text-amber-500">
                  Prediksi ini berdasarkan aturan umum, bukan data historis
                </div>
              )}
            </div>
            
            {prediction.factors.length > 0 && (
              <div>
                <h5 className="text-xs font-medium mb-1">Berdasarkan faktor:</h5>
                <ul className="text-xs space-y-1">
                  {prediction.factors.map((factor, i) => (
                    <li key={i} className="flex items-start">
                      <ArrowRight className="h-3 w-3 mr-1 mt-0.5 text-muted-foreground" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {(prediction.suggest_later_end || prediction.suggest_earlier_start) && onUpdateTaskDates && (
              <div className="pt-2">
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleAdjustDates}>
                  Sesuaikan Tanggal
                </Button>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  )
} 