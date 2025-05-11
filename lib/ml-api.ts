/**
 * ML API Client - Modul untuk mengakses layanan ML
 */

// URL dari ML API
const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000';

/**
 * Tipe data untuk hasil analisis blocker
 */
export interface BlockerAnalysis {
  is_blocker: boolean;
  confidence: number;
  flagged_phrases: string[];
  recommendation: string;
}

/**
 * Tipe data untuk hasil analisis task
 */
export interface TaskAnalysisResult {
  task_id: number;
  analysis: BlockerAnalysis;
}

/**
 * Tipe data untuk komentar
 */
export interface CommentData {
  content: string;
  createdAt?: string;
  userId?: number;
}

/**
 * Tipe data untuk prediksi timeline
 */
export interface TimelinePrediction {
  task_id: number;
  predicted_days: number | null;
  confidence: number;
  predicted_completion_date: string | null;
  factors: string[];
  suggest_earlier_start: boolean;
  suggest_later_end: boolean;
}

/**
 * Tipe data untuk task (untuk prediksi timeline)
 */
export interface TaskData {
  id?: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  estimatedHours?: number;
  dependencies?: number[];
  team_size?: string;
}

/**
 * Periksa status kesehatan server ML
 */
export async function checkMlServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Tambahkan timeout untuk mencegah permintaan terlalu lama
      signal: AbortSignal.timeout(5000), // berhenti setelah 5 detik
    });

    return response.ok;
  } catch (error) {
    console.error('Error checking ML service health:', error);
    return false;
  }
}

/**
 * Mendeteksi blocker dari teks
 */
export async function detectBlockers(text: string, threshold: number = 0.2): Promise<BlockerAnalysis> {
  try {
    // Periksa kesehatan server terlebih dahulu
    const isHealthy = await checkMlServiceHealth();
    if (!isHealthy) {
      throw new Error('ML service is unavailable');
    }
    
    const response = await fetch(`${ML_API_URL}/detect-blockers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error from ML API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error detecting blockers:', error);
    // Return default response if API fails
    return {
      is_blocker: false,
      confidence: 0,
      flagged_phrases: [],
      recommendation: 'ML service unavailable',
    };
  }
}

/**
 * Menganalisis komentar untuk menemukan blocker
 */
export async function analyzeComments(
  comments: CommentData[],
  threshold: number = 0.2
): Promise<BlockerAnalysis> {
  try {
    // Periksa kesehatan server terlebih dahulu
    const isHealthy = await checkMlServiceHealth();
    if (!isHealthy) {
      throw new Error('ML service is unavailable');
    }
    
    const response = await fetch(`${ML_API_URL}/analyze-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comments,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error from ML API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing comments:', error);
    // Re-throw error untuk ditangani oleh komponen
    throw error;
  }
}

/**
 * Menganalisis task untuk menemukan blocker
 */
export async function analyzeTask(
  taskId: number, 
  name: string, 
  description?: string, 
  comments?: CommentData[],
  threshold: number = 0.2
): Promise<TaskAnalysisResult> {
  try {
    // Periksa kesehatan server terlebih dahulu
    const isHealthy = await checkMlServiceHealth();
    if (!isHealthy) {
      throw new Error('ML service is unavailable');
    }
    
    const response = await fetch(`${ML_API_URL}/analyze-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: taskId,
        name,
        description,
        comments,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error from ML API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing task:', error);
    // Re-throw error untuk ditangani oleh komponen
    throw error;
  }
}

/**
 * Memprediksi timeline dari task berdasarkan data historis
 */
export async function predictTaskTimeline(
  task: TaskData,
  historicalTasks: TaskData[] = []
): Promise<TimelinePrediction> {
  try {
    // Periksa kesehatan server terlebih dahulu
    const isHealthy = await checkMlServiceHealth();
    if (!isHealthy) {
      throw new Error('ML service is unavailable');
    }
    
    const response = await fetch(`${ML_API_URL}/predict-timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        historical_tasks: historicalTasks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error from ML API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error predicting task timeline:', error);
    
    // Estimasi fallback sederhana berdasarkan deskripsi task ketika layanan ML tidak tersedia
    let predictedDays = null;
    let confidence = 0.3;
    let factors = ['ML service unavailable'];
    
    // Hitung jumlah kata untuk estimasi sederhana
    if (task.name) {
      const wordCount = (task.name + (task.description || "")).split(/\s+/).length;
      
      // Estimasi berdasarkan jumlah kata
      if (wordCount > 0) {
        predictedDays = Math.max(1, Math.ceil(wordCount / 20));
        factors = [`Estimasi berdasarkan jumlah kata (${wordCount} kata)`];
        
        // Tambahkan faktor jam yang diestimasi jika ada
        if (task.estimatedHours && task.estimatedHours > 0) {
          const daysFromHours = Math.ceil(task.estimatedHours / 6); // Asumsi 6 jam per hari kerja
          predictedDays = Math.ceil((predictedDays + daysFromHours) / 2);
          factors.push(`Estimasi berdasarkan jam (${task.estimatedHours} jam)`);
        }
        
        // Tambahkan faktor dependensi jika ada
        if (task.dependencies && task.dependencies.length > 0) {
          predictedDays = Math.ceil(predictedDays * (1 + (task.dependencies.length * 0.1)));
          factors.push(`Task memiliki ${task.dependencies.length} dependensi`);
        }
      }
    }
    
    // Hitung predicted completion date jika ada startDate
    let predictedCompletionDate = null;
    if (task.startDate && predictedDays) {
      try {
        const startDate = new Date(task.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + predictedDays - 1);
        predictedCompletionDate = endDate.toISOString();
      } catch (e) {
        console.error('Error calculating completion date:', e);
      }
    }
    
    return {
      task_id: task.id || 0,
      predicted_days: predictedDays,
      confidence: confidence,
      predicted_completion_date: predictedCompletionDate,
      factors: factors,
      suggest_earlier_start: false,
      suggest_later_end: predictedDays !== null && task.endDate ? new Date(task.endDate) < new Date(predictedCompletionDate!) : false
    };
  }
}

/**
 * Mengambil daftar kata kunci yang digunakan oleh model
 */
export async function getBlockerKeywords(): Promise<{
  blocker_keywords: string[];
  resolution_keywords: string[];
  negation_words: string[];
}> {
  try {
    const response = await fetch(`${ML_API_URL}/keywords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error from ML API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting blocker keywords:', error);
    // Return empty lists if API fails
    return {
      blocker_keywords: [],
      resolution_keywords: [],
      negation_words: [],
    };
  }
} 