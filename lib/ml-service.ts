/**
 * ML Service Manager - Utilitas untuk mengelola dan memeriksa status layanan ML
 */

import { exec } from 'child_process';
import path from 'path';
import { checkMlServiceHealth } from './ml-api';

/**
 * Interface untuk respons status ML service
 */
export interface MlServiceStatus {
  isRunning: boolean;
  timelineServiceOk: boolean;
  blockerServiceOk: boolean;
  message: string;
}

/**
 * Cek kesehatan lengkap dari layanan ML termasuk kedua fitur utama
 */
export async function checkMlServiceFullStatus(): Promise<MlServiceStatus> {
  try {
    // Cek apakah server ML merespons
    const isHealthy = await checkMlServiceHealth();
    
    if (!isHealthy) {
      return {
        isRunning: false,
        timelineServiceOk: false,
        blockerServiceOk: false,
        message: 'Layanan ML tidak berjalan. Jalankan script start-ml.sh untuk mengaktifkannya.'
      };
    }
    
    // Cek fitur timeline prediction
    let timelineServiceOk = false;
    try {
      const timelineResponse = await fetch(`${process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000'}/predict-timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            name: 'Test Task',
            description: 'Test Description',
            status: 'Not Started'
          }
        }),
      });
      
      timelineServiceOk = timelineResponse.ok;
    } catch (error) {
      console.error('Error checking timeline service:', error);
      timelineServiceOk = false;
    }
    
    // Cek fitur blocker detection
    let blockerServiceOk = false;
    try {
      const blockerResponse = await fetch(`${process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000'}/detect-blockers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test blocker text',
          threshold: 0.2
        }),
      });
      
      blockerServiceOk = blockerResponse.ok;
    } catch (error) {
      console.error('Error checking blocker service:', error);
      blockerServiceOk = false;
    }
    
    return {
      isRunning: true,
      timelineServiceOk,
      blockerServiceOk,
      message: timelineServiceOk && blockerServiceOk 
        ? 'Layanan ML berjalan dengan baik' 
        : `Layanan ML berjalan, tetapi ${!timelineServiceOk ? 'prediksi timeline' : ''}${!timelineServiceOk && !blockerServiceOk ? ' dan ' : ''}${!blockerServiceOk ? 'deteksi blocker' : ''} tidak berfungsi`
    };
    
  } catch (error) {
    console.error('Error checking ML service status:', error);
    return {
      isRunning: false,
      timelineServiceOk: false,
      blockerServiceOk: false,
      message: 'Terjadi kesalahan saat memeriksa status layanan ML'
    };
  }
}

/**
 * Fungsi untuk menjalankan layanan ML di sisi server
 * Catatan: Fungsi ini hanya dapat dijalankan dari server-side code
 */
export async function startMlService(): Promise<{ success: boolean, message: string }> {
  return new Promise((resolve) => {
    // Jalankan script start.sh dalam mode background
    const mlServicePath = path.resolve(process.cwd(), 'ml-service');
    
    // Periksa terlebih dahulu apakah sudah berjalan
    exec(`cd ${mlServicePath} && bash start.sh --bg`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting ML service: ${error.message}`);
        resolve({ 
          success: false, 
          message: `Gagal menjalankan layanan ML: ${error.message}`
        });
        return;
      }
      
      if (stderr) {
        console.error(`ML service stderr: ${stderr}`);
      }
      
      console.log(`ML service stdout: ${stdout}`);
      
      // Tunggu beberapa detik untuk memastikan layanan sudah berjalan
      setTimeout(async () => {
        const status = await checkMlServiceFullStatus();
        if (status.isRunning) {
          resolve({ 
            success: true, 
            message: 'Layanan ML berhasil dijalankan'
          });
        } else {
          resolve({ 
            success: false, 
            message: 'Layanan ML dijalankan tetapi tidak merespons'
          });
        }
      }, 3000);
    });
  });
}

/**
 * Periksa status kedua fitur ML dan pastikan keduanya berjalan
 */
export async function ensureMlServiceRunning(): Promise<MlServiceStatus> {
  // Cek status layanan
  const status = await checkMlServiceFullStatus();
  
  // Jika tidak berjalan, coba jalankan
  if (!status.isRunning) {
    try {
      const startResult = await startMlService();
      if (startResult.success) {
        return await checkMlServiceFullStatus();
      }
    } catch (error) {
      console.error('Error starting ML service:', error);
    }
  }
  
  return status;
} 