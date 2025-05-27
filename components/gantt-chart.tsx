"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { format, addDays, differenceInDays, parseISO, isSameDay, startOfDay, isEqual, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { id } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { X, ZoomIn, ZoomOut, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Custom hook untuk interval dengan delay
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

interface Task {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  assignee: string | null
  dependencies: number[]
}

interface GanttChartProps {
  tasks: Task[]
  onTaskUpdated?: () => void
}

export function GanttChart({ tasks, onTaskUpdated }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [activeTask, setActiveTask] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())
  const [timeScale, setTimeScale] = useState<"day" | "week" | "month">("day")
  const [zoomLevel, setZoomLevel] = useState<number>(1)

  // Urutkan task berdasarkan startDate (dari yang paling awal ke yang terakhir)
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  })

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [lastUpdate])

  // Sinkronisasi scroll antara header dan konten
  useEffect(() => {
    const handleContentScroll = () => {
      if (headerScrollRef.current && scrollContainerRef.current) {
        headerScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
      }
    };
    
    const contentScroll = scrollContainerRef.current;
    if (contentScroll) {
      contentScroll.addEventListener('scroll', handleContentScroll);
      return () => contentScroll.removeEventListener('scroll', handleContentScroll);
    }
  }, []);

  // Fungsi untuk normalisasi tanggal (menghapus bagian waktu)
  const parseDateWithoutTime = (dateStr: string) => {
    return startOfDay(parseISO(dateStr))
  }

  // Fungsi untuk mendapatkan tanggal berdasarkan skala waktu
  const getDateRangeByScale = useCallback(() => {
    // Tanggal-tanggal task setelah normalisasi (tanpa debug logging)
    const normalizedDates = sortedTasks.map(task => {
      const start = parseDateWithoutTime(task.startDate);
      const end = parseDateWithoutTime(task.endDate);
      return { 
        id: task.id, 
        name: task.name,
        start,
        end
      };
    });

    // Find project start and end dates
    const startDates = normalizedDates.map(task => task.start);
    const endDates = normalizedDates.map(task => task.end);
    
    // Pastikan ada tanggal valid sebelum menghitung min/max
    const projectStart = startDates.length > 0 
      ? new Date(Math.min(...startDates.map(date => date.getTime())))
      : new Date();
    const projectEnd = endDates.length > 0
      ? new Date(Math.max(...endDates.map(date => date.getTime())))
      : addDays(new Date(), 30);

    // Gunakan tanggal proyek tanpa padding untuk keakuratan
    const paddedStart = projectStart;
    const paddedEnd = projectEnd;

    // Buat array tanggal berdasarkan skala waktu
    let dateRange: Date[] = [];
    
    switch (timeScale) {
      case "day":
        // Hari per hari (format asli)
        dateRange = Array.from(
          { length: differenceInDays(paddedEnd, paddedStart) + 1 },
          (_, i) => addDays(paddedStart, i)
        );
        break;
      
      case "week":
        // Mingguan (ambil hari pertama setiap minggu)
        const weekStart = startOfWeek(paddedStart, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(paddedEnd, { weekStartsOn: 1 });
        const weekCount = Math.ceil(differenceInDays(weekEnd, weekStart) / 7);
        
        dateRange = Array.from(
          { length: weekCount },
          (_, i) => addWeeks(weekStart, i)
        );
        break;
      
      case "month":
        // Bulanan (ambil hari pertama setiap bulan)
        const monthStart = startOfMonth(paddedStart);
        const monthEnd = endOfMonth(paddedEnd);
        let currentDate = monthStart;
        
        while (currentDate <= monthEnd) {
          dateRange.push(currentDate);
          currentDate = startOfMonth(addMonths(currentDate, 1));
        }
        break;
    }
    
    return {
      dateRange,
      paddedStart,
      paddedEnd,
      totalDays: differenceInDays(paddedEnd, paddedStart) + 1
    };
  }, [sortedTasks, timeScale]);

  const { dateRange, paddedStart, paddedEnd, totalDays } = getDateRangeByScale();

  // Calculate day width based on container width, total days, and zoom level
  const labelWidth = 160; // Lebar area label
  const availableWidth = containerWidth - labelWidth;
  const baseWidth = Math.max(30, Math.min(50, availableWidth / totalDays));
  const dayWidth = baseWidth * zoomLevel;

  // Format tanggal header berdasarkan skala waktu
  const formatDateHeader = (date: Date, index: number) => {
    switch (timeScale) {
      case "day":
        return (
          <>
            <div>{format(date, "d")}</div>
            <div className="text-muted-foreground">{format(date, "MMM")}</div>
          </>
        );
      case "week":
        return (
          <>
            <div>W{format(date, "w")}</div>
            <div className="text-muted-foreground">{format(date, "MMM yyyy")}</div>
          </>
        );
      case "month":
        return (
          <>
            <div>{format(date, "MMM")}</div>
            <div className="text-muted-foreground">{format(date, "yyyy")}</div>
          </>
        );
    }
  };

  // Fungsi untuk mendapatkan posisi task pada chart (dimodifikasi untuk mendukung berbagai skala waktu)
  const getTaskPosition = (task: Task) => {
    const taskStart = parseDateWithoutTime(task.startDate);
    const taskEnd = parseDateWithoutTime(task.endDate);
    
    // Selisih hari antara tanggal mulai task dengan tanggal awal proyek
    let daysFromStart = 0;
    
    // Jika tanggal mulai sama dengan tanggal awal proyek, posisi 0
    if (isEqual(taskStart, paddedStart)) {
      daysFromStart = 0;
    } else {
      daysFromStart = differenceInDays(taskStart, paddedStart);
    }
    
    // Hitung durasi task dalam hari (min 1 hari)
    const taskDuration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

    // Sesuaikan posisi berdasarkan skala waktu
    let left, width;
    
    switch (timeScale) {
      case "day":
        left = daysFromStart * dayWidth;
        width = Math.max(taskDuration * dayWidth, 30); // Minimal width
        break;
      
      case "week":
        // Konversi hari ke minggu (posisi)
        const weeksFromStart = Math.floor(daysFromStart / 7);
        left = weeksFromStart * dayWidth;
        
        // Durasi dalam minggu (minimal 1)
        const weekDuration = Math.ceil(taskDuration / 7);
        width = Math.max(weekDuration * dayWidth, 30);
        break;
      
      case "month":
        // Ini lebih kompleks karena bulan memiliki jumlah hari yang berbeda
        // Sebagai pendekatan sederhana, kita ambil jumlah minggu dari awal proyek
        const monthsFromStart = Math.floor(daysFromStart / 30);
        left = monthsFromStart * dayWidth;
        
        // Durasi dalam bulan (minimal 1)
        const monthDuration = Math.ceil(taskDuration / 30);
        width = Math.max(monthDuration * dayWidth, 30);
        break;
    }

    return { left, width };
  };

  // Get color based on task status
  const getTaskColor = (task: Task) => {
    switch (task.status) {
      case "Completed":
        return "bg-green-500"
      case "In Progress":
        return "bg-blue-500"
      case "Not Started":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  // Format date untuk tampilan
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMMM yyyy", { locale: id })
  }

  const toggleTaskTooltip = (taskId: number) => {
    setShowTooltip(showTooltip === taskId ? null : taskId)
  }

  // Menentukan posisi tooltip berdasarkan posisi task pada chart
  const getTooltipPosition = (taskLeft: number, taskWidth: number, index: number, isAtStart: boolean) => {
    const tooltipWidth = 256; // lebar tooltip (w-64 = 16rem = 256px)
    
    // Posisi horizontal
    let left;
    if (isAtStart) {
      // Jika task di awal, posisikan tooltip sesuai dengan task
      left = taskLeft + labelWidth;
    } else {
      // Jika tidak, posisikan tooltip di tengah task
      left = taskLeft + labelWidth + (taskWidth / 2) - (tooltipWidth / 2);
    }
    
    // Posisi vertikal
    // Untuk 1/3 task pertama, tampilkan tooltip di bawah
    const showBelow = index < sortedTasks.length / 3;
    const top = showBelow 
      ? `${index * 40 + 35}px` // di bawah task
      : `${index * 40 - 4}px`; // di atas task (default)
    
    const transform = showBelow 
      ? '' // tidak perlu transform jika di bawah
      : 'translateY(-100%)'; // naik penuh jika di atas
      
    const arrowClass = showBelow
      ? "top-[-8px] border-l border-t" // panah di atas
      : "bottom-[-8px] border-r border-b"; // panah di bawah
    
    return { left, top, transform, arrowClass, showBelow };
  }

  // Fungsi untuk zoom in dan out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Menghitung lebar konten untuk timeline
  const timelineWidth = Math.min(Math.max(dateRange.length * dayWidth, 300), 1000);

  return (
    <div className="w-full h-full overflow-hidden flex flex-col" ref={containerRef}>
      {/* Controls */}
      <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-background z-40">
        <div className="flex items-center space-x-2">
          <Select 
            value={timeScale} 
            onValueChange={(value) => setTimeScale(value as "day" | "week" | "month")}
          >
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Skala Waktu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hari</SelectItem>
              <SelectItem value="week">Minggu</SelectItem>
              <SelectItem value="month">Bulan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart Container dengan overflow auto untuk keseluruhan konten */}
      <div className="flex-grow overflow-auto">
        {/* Header Row - Sticky untuk scroll vertikal */}
        <div className="flex sticky top-0 z-30 bg-background">
          {/* Fixed header for task names column */}
          <div className="flex-none w-[160px] border-r border-b bg-background" style={{ position: 'sticky', left: 0, zIndex: 35 }}>
            <div className="h-[42px] font-medium flex items-center justify-center text-xs text-muted-foreground">
              Nama Task
            </div>
          </div>
          
          {/* Scrollable header for dates */}
          <div ref={headerScrollRef} className="flex-grow" style={{ width: `${timelineWidth}px` }}>
            <div className="flex border-b" style={{ width: '100%' }}>
              {dateRange.map((date, index) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={index}
                    className={`flex flex-col items-center justify-center border-r p-1 text-xs ${
                      isWeekend ? "bg-gray-50" : ""
                    }`}
                    style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }}
                  >
                    {formatDateHeader(date, index)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex">
          {/* Fixed left column for task names */}
          <div className="flex-none w-[160px] bg-background" style={{ position: 'sticky', left: 0, zIndex: 25 }}>
            <div className="border-r h-full">
              {sortedTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center px-2 text-sm h-[40px] border-b border-gray-100"
                >
                  <div 
                    className="font-medium truncate max-w-[150px] hover:text-blue-600 transition-colors"
                    title={task.name}
                  >
                    {task.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Timeline content with horizontal scroll */}
          <div 
            ref={scrollContainerRef} 
            style={{ width: `${timelineWidth}px`, position: 'relative' }}
          >
            <div style={{ 
              width: '100%',
              position: 'relative',
              minHeight: `${Math.max(sortedTasks.length * 40, 100)}px`,
            }}>
              {/* Background grid */}
              <div className="absolute inset-0 grid" style={{ 
                gridTemplateColumns: `repeat(${dateRange.length}, ${dayWidth}px)`,
                width: '100%',
                height: '100%'
              }}>
                {dateRange.map((date, index) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={index}
                      className={`h-full border-r ${isWeekend ? "bg-gray-50/50" : ""}`}
                    />
                  )
                })}
              </div>
              
              {/* Garis horizontal untuk setiap baris task */}
              {sortedTasks.map((_, index) => (
                <div 
                  key={`line-${index}`}
                  className="absolute w-full border-b border-gray-100"
                  style={{ top: `${index * 40}px` }}
                />
              ))}
              
              {/* Task bars */}
              {sortedTasks.map((task, index) => {
                const { left, width } = getTaskPosition(task)
                const colorClass = getTaskColor(task)
                const isActive = activeTask === task.id
                const tooltipVisible = showTooltip === task.id
                const isAtStart = left < 100; // Mendeteksi apakah task berada di awal chart
                
                // Menghitung posisi tooltip
                const { 
                  left: tooltipLeft, 
                  top: tooltipTop, 
                  transform: tooltipTransform,
                  arrowClass,
                  showBelow
                } = getTooltipPosition(left, width, index, isAtStart);
                
                return (
                  <div key={task.id} className="relative">
                    <div
                      className={`absolute rounded-md ${colorClass} flex items-center justify-start text-white text-xs cursor-pointer transition-all hover:brightness-110 ${isActive ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        left: `${left}px`,
                        top: `${index * 40 + 8}px`,
                        width: `${Math.min(width, timelineWidth - left)}px`, // Pastikan tidak melebihi batas lebar
                        height: "24px",
                        boxShadow: isActive ? "0 4px 8px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.1)",
                        zIndex: tooltipVisible ? 15 : 10
                      }}
                      onClick={() => {
                        setActiveTask(isActive ? null : task.id)
                        toggleTaskTooltip(task.id)
                      }}
                    >
                      <div className="truncate px-2">{task.name}</div>
                      
                      {/* Progress indicator */}
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-50 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    
                    {/* Fixed tooltip that appears on click */}
                    {tooltipVisible && (
                      <div 
                        className="absolute z-40 bg-white rounded-md border shadow-lg p-3 w-64"
                        style={{
                          left: tooltipLeft,
                          top: tooltipTop,
                          transform: tooltipTransform,
                          maxWidth: "250px"
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{task.name}</h4>
                          <button 
                            className="text-gray-400 hover:text-gray-600" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowTooltip(null)
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                        
                        <div className="text-xs grid grid-cols-2 gap-x-2 gap-y-1">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium">{task.status}</span>
                          
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="font-medium">{task.progress}%</span>
                          
                          <span className="text-muted-foreground">Mulai:</span>
                          <span className="font-medium">{formatDate(task.startDate)}</span>
                          
                          <span className="text-muted-foreground">Selesai:</span>
                          <span className="font-medium">{formatDate(task.endDate)}</span>
                          
                          {task.assignee && (
                            <>
                              <span className="text-muted-foreground">Assignee:</span>
                              <span className="font-medium">{task.assignee}</span>
                            </>
                          )}
                        </div>
                        
                        <div className={`w-4 h-4 bg-white ${arrowClass} rotate-45 absolute left-1/2 transform -translate-x-1/2`}></div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Dependency lines */}
              {sortedTasks.map((task) =>
                task.dependencies?.map((depId) => {
                  const dependencyTask = sortedTasks.find((t) => t.id === depId)
                  if (!dependencyTask) return null

                  const depIndex = sortedTasks.findIndex((t) => t.id === depId)
                  const taskIndex = sortedTasks.findIndex((t) => t.id === task.id)
                  
                  if (depIndex === -1 || taskIndex === -1) return null
                  
                  const depPos = getTaskPosition(dependencyTask)
                  const taskPos = getTaskPosition(task)
                  
                  const startX = depPos.left + depPos.width
                  const startY = depIndex * 40 + 20
                  const endX = taskPos.left
                  const endY = taskIndex * 40 + 20
                  
                  // Control points for curve
                  const midX = startX + (endX - startX) / 2
                  
                  return (
                    <svg
                      key={`${task.id}-${depId}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 5,
                      }}
                    >
                      <defs>
                        <linearGradient id={`gradient-${task.id}-${depId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={activeTask === depId ? "#6366F1" : "#9CA3AF"} />
                          <stop offset="100%" stopColor={activeTask === task.id ? "#6366F1" : "#9CA3AF"} />
                        </linearGradient>
                        
                        <marker
                          id={`arrowhead-${task.id}-${depId}`}
                          markerWidth="8"
                          markerHeight="6"
                          refX="8"
                          refY="3"
                          orient="auto"
                        >
                          <polygon 
                            points="0 0, 8 3, 0 6" 
                            fill={activeTask === task.id || activeTask === depId ? "#6366F1" : "#9CA3AF"} 
                          />
                        </marker>
                      </defs>
                      
                      <path
                        d={`M${startX},${startY} C${midX},${startY} ${midX},${endY} ${endX},${endY}`}
                        stroke={`url(#gradient-${task.id}-${depId})`}
                        strokeWidth={activeTask === task.id || activeTask === depId ? "2.5" : "1.5"}
                        strokeLinecap="round"
                        fill="none"
                        markerEnd={`url(#arrowhead-${task.id}-${depId})`}
                      />
                    </svg>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}