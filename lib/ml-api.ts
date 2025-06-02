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
  commentPreviews?: Array<{ phrase: string; from: string }>;
  groupedComments?: Array<{
    preview: string;
    phrases: string[];
    confidence: number;
  }>;
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
  title?: string;
  name?: string;
  description?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  type?: string;
  team_size: 'Small' | 'Medium' | 'Large';
  task_type: 'Development' | 'Testing' | 'Documentation' | 'Research' | 'Meeting' | 'Other';
  estimated_hours: number;
  word_count?: number;
  dependency_count: number;
  startDate?: string;
  endDate?: string;
  dependencies?: number[];
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
 * @param text Teks yang akan dianalisis (bisa berisi nama task, deskripsi, dan komentar)
 */
export async function detectBlockers(text: string): Promise<BlockerAnalysis> {
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
        text
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

// Helper untuk menentukan team size berdasarkan jumlah anggota
function determineTeamSize(memberCount: number): 'Small' | 'Medium' | 'Large' {
  if (memberCount <= 3) return 'Small'
  if (memberCount <= 6) return 'Medium'
  return 'Large'
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

    // Hitung word count jika tidak disediakan
    const calculateWordCount = (text?: string) => {
      if (!text) return 0;
      return text.trim().split(/\s+/).length;
    };

    // Format data sesuai yang diharapkan ML API
    const formattedTask = {
      status: task.status,
      priority: task.priority || "Medium",
      team_size: (task.team_size || "Small").toLowerCase(),
      task_type: task.task_type || "Development",
      estimated_hours: task.estimated_hours,
      title: task.title || task.name || "",
      description: task.description || "",
      word_count: task.word_count || calculateWordCount(task.description),
      dependency_count: Math.max(0, Number(task.dependency_count) || 0),
      startDate: task.startDate || new Date().toISOString().split('T')[0]
    };

    // Log request data untuk debugging
    console.log('Sending request data:', {
      task: formattedTask
    });

    const response = await fetch(`${ML_API_URL}/predict-timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: formattedTask
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ML API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Error from ML API: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('ML API Response:', result);

    return {
      task_id: task.id || result.task_id || 0,
      predicted_days: result.predicted_days,
      confidence: result.confidence,
      predicted_completion_date: result.predicted_completion_date,
      factors: result.factors || [],
      suggest_earlier_start: result.suggest_earlier_start || false,
      suggest_later_end: result.suggest_later_end || false
    };

  } catch (error) {
    console.error('Error predicting task timeline:', error);
    
    return {
      task_id: task.id || 0,
      predicted_days: null,
      confidence: 0.3,
      predicted_completion_date: null,
      factors: ['ML service unavailable'],
      suggest_earlier_start: false,
      suggest_later_end: false
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