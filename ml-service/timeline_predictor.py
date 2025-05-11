"""
Timeline Predictor - Modul untuk memprediksi durasi task berdasarkan data historis
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from typing import List, Dict, Any, Optional, Tuple
import logging
import re

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timeline_predictor")

class TimelinePredictor:
    """
    Model untuk memprediksi berapa lama sebuah task akan selesai
    berdasarkan data historis task-task sebelumnya.
    """
    
    def __init__(self):
        """Inisialisasi timeline predictor"""
        logger.info("Initializing TimelinePredictor")
        self.model = None
        self.preprocessor = None
        self.categorical_features = ['status', 'priority', 'team_size', 'task_type']
        self.numerical_features = ['estimated_hours', 'word_count', 'dependency_count']
        self.target = 'actual_days'
        self.is_trained = False
        
        # Inisialisasi model dengan default jika tidak ada data training
        self._initialize_default_model()
        logger.info("TimelinePredictor initialized successfully")
    
    def _initialize_default_model(self):
        """Inisialisasi model default"""
        logger.info("Initializing default model")
        try:
            # Buat preprocessor
            categorical_transformer = OneHotEncoder(handle_unknown='ignore')
            numerical_transformer = StandardScaler()
            
            self.preprocessor = ColumnTransformer(
                transformers=[
                    ('cat', categorical_transformer, self.categorical_features),
                    ('num', numerical_transformer, self.numerical_features)
                ], remainder='drop')
            
            # Buat pipeline dengan Random Forest
            self.model = Pipeline(steps=[
                ('preprocessor', self.preprocessor),
                ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
            ])
            logger.info("Default model initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing default model: {str(e)}")
            raise
    
    def extract_features_from_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ekstrak fitur dari task untuk prediksi
        
        Args:
            task: Data task
            
        Returns:
            Dict: Fitur yang diekstrak
        """
        try:
            logger.info(f"Extracting features from task: {task.get('name', 'Unknown task')}")
            # Ekstrak fitur dari task
            name = task.get('name', '')
            description = task.get('description', '')
            
            # Hitung jumlah kata dalam nama dan deskripsi
            word_count = len(name.split()) + len(description.split()) if description else len(name.split())
            
            # Ekstrak informasi lain
            status = task.get('status', 'Not Started')
            estimated_hours = task.get('estimatedHours', 0)
            dependency_count = len(task.get('dependencies', []))
            
            # Tentukan prioritas berdasarkan konten (bisa disesuaikan)
            priority = 'Medium'  # Default
            priority_words = {
                'High': ['urgent', 'penting', 'segera', 'critical', 'high', 'tinggi'],
                'Low': ['optional', 'opsional', 'jika ada waktu', 'low', 'rendah']
            }
            
            combined_text = (name + " " + description).lower()
            for p, words in priority_words.items():
                if any(word in combined_text for word in words):
                    priority = p
                    break
            
            # Tentukan tipe task berdasarkan konten (bisa disesuaikan)
            task_type = 'Other'  # Default
            task_types = {
                'Development': ['develop', 'code', 'implement', 'programming', 'coding', 'development'],
                'Design': ['design', 'ui', 'ux', 'interface', 'visual'],
                'Testing': ['test', 'qa', 'bug', 'debug', 'verification', 'validasi'],
                'Documentation': ['doc', 'documentation', 'dokumentasi', 'write', 'tulis'],
                'Meeting': ['meeting', 'rapat', 'diskusi', 'discuss', 'pertemuan']
            }
            
            for t, words in task_types.items():
                if any(word in combined_text for word in words):
                    task_type = t
                    break
            
            # Ambil ukuran tim dari data task atau estimasi
            team_size = task.get('team_size', 'Small')  # Default Small
            
            features = {
                'status': status,
                'priority': priority,
                'team_size': team_size,
                'task_type': task_type,
                'estimated_hours': estimated_hours,
                'word_count': word_count,
                'dependency_count': dependency_count
            }
            
            logger.info(f"Extracted features: {features}")
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            # Return a default set of features in case of error
            return {
                'status': 'Not Started',
                'priority': 'Medium',
                'team_size': 'Small',
                'task_type': 'Other',
                'estimated_hours': 8,
                'word_count': 10,
                'dependency_count': 0
            }
    
    def calculate_actual_days(self, task: Dict[str, Any]) -> float:
        """
        Hitung durasi sebenarnya dari task yang sudah selesai
        
        Args:
            task: Data task
            
        Returns:
            float: Durasi dalam hari
        """
        start_date = task.get('startDate')
        end_date = task.get('actual_end_date', task.get('endDate'))
        
        if not start_date or not end_date:
            return 0.0
        
        # Convert dates to datetime
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            return (end_dt - start_dt).days + 1
        except Exception as e:
            logger.error(f"Error calculating actual days: {str(e)}")
            return 0.0
    
    def train(self, historical_tasks: List[Dict[str, Any]]) -> bool:
        """
        Latih model dengan data historis task
        
        Args:
            historical_tasks: List task historis yang sudah selesai
            
        Returns:
            bool: True jika training berhasil
        """
        if not historical_tasks:
            logger.warning("Tidak ada data historis untuk melatih model")
            return False
        
        try:
            logger.info(f"Training model with {len(historical_tasks)} historical tasks")
            # Buat dataframe dari tasks
            data = []
            for task in historical_tasks:
                if task.get('status') == 'Completed':
                    features = self.extract_features_from_task(task)
                    actual_days = self.calculate_actual_days(task)
                    if actual_days > 0:
                        features[self.target] = actual_days
                        data.append(features)
            
            if len(data) < 5:
                logger.warning(f"Data tidak cukup untuk training (hanya {len(data)} samples)")
                return False
            
            df = pd.DataFrame(data)
            logger.info(f"Created dataframe with {len(df)} rows and columns: {df.columns.tolist()}")
            
            # Split data
            X = df.drop(self.target, axis=1)
            y = df[self.target]
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Reinisialisasi model
            self._initialize_default_model()
            
            # Train model
            self.model.fit(X_train, y_train)
            self.is_trained = True
            
            # Evaluasi model
            train_score = self.model.score(X_train, y_train)
            test_score = self.model.score(X_test, y_test)
            logger.info(f"Model trained: Train R² = {train_score:.4f}, Test R² = {test_score:.4f}")
            
            return True
        
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            # Reinisialisasi model
            self._initialize_default_model()
            self.is_trained = False
            return False
    
    def predict_fallback(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prediksi fallback menggunakan aturan sederhana ketika model ML belum dilatih
        
        Args:
            task: Data task untuk diprediksi
            
        Returns:
            dict: Hasil prediksi berdasarkan aturan sederhana
        """
        logger.info("Using fallback prediction method (rule-based)")
        features = self.extract_features_from_task(task)
        
        # Estimasi dasar berdasarkan tipe task
        base_days = {
            'Development': 5,
            'Design': 3,
            'Testing': 2,
            'Documentation': 2,
            'Meeting': 1,
            'Other': 3
        }
        
        # Faktor pengali berdasarkan kompleksitas
        complexity_factor = 1.0
        
        # Aturan 1: Estimasi berdasarkan jam yang diperkirakan
        if features['estimated_hours'] > 0:
            # Asumsi 6 jam kerja per hari
            days_from_hours = features['estimated_hours'] / 6
            # Gabungkan dengan estimasi tipe
            predicted_days = (base_days.get(features['task_type'], 3) + days_from_hours) / 2
        else:
            predicted_days = base_days.get(features['task_type'], 3)
        
        # Aturan 2: Task dengan banyak kata cenderung lebih kompleks
        if features['word_count'] > 20:
            complexity_factor += 0.2
        elif features['word_count'] > 50:
            complexity_factor += 0.5
        
        # Aturan 3: Dependensi menambah waktu
        dependency_factor = 1.0 + (min(features['dependency_count'], 5) * 0.1)
        
        # Aturan 4: Prioritas tinggi biasanya diselesaikan lebih cepat
        priority_factor = 1.0
        if features['priority'] == 'High':
            priority_factor = 0.8
        elif features['priority'] == 'Low':
            priority_factor = 1.2
        
        # Combine all factors
        final_prediction = predicted_days * complexity_factor * dependency_factor * priority_factor
        
        # Round to nearest day, minimum 1 day
        predicted_days = max(1, int(round(final_prediction)))
        
        # Hitung confidence berdasarkan konsistensi faktor-faktor
        base_confidence = 0.5  # Rendah karena hanya rule-based
        
        # Faktor yang mempengaruhi prediksi
        factors = []
        if features['dependency_count'] > 0:
            factors.append(f"Task memiliki {features['dependency_count']} dependensi")
        
        if features['estimated_hours'] > 0:
            factors.append(f"Berdasarkan estimasi {features['estimated_hours']} jam")
        
        if features['priority'] == 'High':
            factors.append("Task prioritas tinggi biasanya diselesaikan lebih cepat")
        
        if features['task_type'] != 'Other':
            factors.append(f"Tipe task: {features['task_type']}")
            
        if features['word_count'] > 30:
            factors.append(f"Deskripsi task cukup kompleks ({features['word_count']} kata)")
        
        # Hitung predicted completion date jika tanggal mulai tersedia
        predicted_completion_date = None
        if task.get('startDate'):
            try:
                start_date = datetime.fromisoformat(task['startDate'].replace('Z', '+00:00'))
                predicted_completion_date = (start_date + timedelta(days=predicted_days - 1)).isoformat()
            except Exception as e:
                logger.error(f"Error calculating fallback completion date: {str(e)}")
        
        return {
            "predicted_days": predicted_days,
            "confidence": 0.5,  # Rendah karena hanya rule-based
            "predicted_completion_date": predicted_completion_date,
            "factors": factors
        }
    
    def predict(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prediksi durasi task
        
        Args:
            task: Data task yang ingin diprediksi
            
        Returns:
            dict: Hasil prediksi
        """
        logger.info(f"Predicting timeline for task: {task.get('name', 'Unknown')}")
        
        # Gunakan prediksi fallback jika model belum dilatih
        if not self.is_trained or not self.model:
            logger.warning("ML model not trained, using fallback prediction")
            return self.predict_fallback(task)
        
        try:
            # Ekstrak fitur
            features = self.extract_features_from_task(task)
            
            # Jika tidak ada estimated_hours, gunakan nilai default
            if features['estimated_hours'] <= 0:
                logger.info("Using default estimated_hours (8)")
                features['estimated_hours'] = 8  # Default 1 hari kerja
            
            # Debug log - melihat fitur yang akan digunakan untuk prediksi
            logger.info(f"Features for prediction: {features}")
            
            # Konversi fitur ke DataFrame
            df = pd.DataFrame([features])
            logger.info(f"DataFrame for prediction: {df.shape}")
            
            # Pastikan semua fitur kategoris ada di DataFrame
            for cat_feature in self.categorical_features:
                if cat_feature not in df.columns:
                    logger.warning(f"Missing categorical feature: {cat_feature}, adding with default value")
                    df[cat_feature] = "Unknown"
            
            # Pastikan semua fitur numerik ada di DataFrame
            for num_feature in self.numerical_features:
                if num_feature not in df.columns:
                    logger.warning(f"Missing numerical feature: {num_feature}, adding with default value")
                    df[num_feature] = 0
            
            # Prediksi
            logger.info("Making prediction...")
            predicted_days = max(1, int(round(self.model.predict(df)[0])))
            logger.info(f"Predicted days: {predicted_days}")
            
            # Coba estimasi tingkat kepercayaan berdasarkan jumlah dependensi dan tipe task
            # Ini adalah pendekatan heuristik sederhana
            base_confidence = 0.7
            
            # Task dengan lebih banyak dependensi cenderung lebih sulit diprediksi
            dependency_factor = 1.0 - (min(features['dependency_count'], 5) * 0.05)
            
            # Tipe task tertentu mungkin lebih mudah diprediksi
            task_type_confidence = {
                'Development': 0.8,
                'Design': 0.7,
                'Testing': 0.85,
                'Documentation': 0.9,
                'Meeting': 0.95,
                'Other': 0.6
            }
            
            type_factor = task_type_confidence.get(features['task_type'], 0.7)
            
            # Hitung confidence
            confidence = base_confidence * dependency_factor * type_factor
            
            # Hitung predicted completion date jika tanggal mulai tersedia
            predicted_completion_date = None
            if task.get('startDate'):
                try:
                    start_date = datetime.fromisoformat(task['startDate'].replace('Z', '+00:00'))
                    predicted_completion_date = (start_date + timedelta(days=predicted_days)).isoformat()
                    logger.info(f"Predicted completion date: {predicted_completion_date}")
                except Exception as e:
                    logger.error(f"Error calculating completion date: {str(e)}")
            
            # Faktor-faktor yang mempengaruhi prediksi
            factors = []
            if features['dependency_count'] > 0:
                factors.append(f"Task memiliki {features['dependency_count']} dependensi")
            
            if features['estimated_hours'] > 16:
                factors.append(f"Estimasi waktu cukup lama ({features['estimated_hours']} jam)")
            
            if features['priority'] == 'High':
                factors.append("Task prioritas tinggi biasanya diselesaikan lebih cepat")
            
            if features['task_type'] != 'Other':
                factors.append(f"Tipe task: {features['task_type']}")
            
            result = {
                "predicted_days": predicted_days,
                "confidence": round(confidence, 2),
                "predicted_completion_date": predicted_completion_date,
                "factors": factors
            }
            
            logger.info(f"Prediction result: {result}")
            return result
        
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}", exc_info=True)
            # Gunakan prediksi fallback jika model ML gagal
            logger.info("ML prediction failed, using fallback prediction")
            return self.predict_fallback(task)


# Contoh penggunaan
if __name__ == "__main__":
    predictor = TimelinePredictor()
    
    # Contoh task
    sample_task = {
        "name": "Implementasi fitur login",
        "description": "Mengembangkan sistem login dengan OAuth dan JWT",
        "status": "Not Started",
        "estimatedHours": 16,
        "dependencies": [1, 2],
        "startDate": "2023-05-10T00:00:00Z",
        "endDate": "2023-05-18T00:00:00Z"
    }
    
    # Prediksi tanpa training
    result = predictor.predict(sample_task)
    print("Prediksi tanpa training:")
    print(f"Predicted days: {result['predicted_days']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Predicted completion date: {result['predicted_completion_date']}")
    print(f"Factors: {result['factors']}") 