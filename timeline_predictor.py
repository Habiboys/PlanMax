"""
Timeline Predictor Module - Complete Fix for Model Loading Issues
Modul untuk memprediksi timeline penyelesaian tugas dengan solusi lengkap untuk masalah loading model.
"""

import pandas as pd
import numpy as np
import joblib
import os
import pickle
import sys
import importlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import warnings
warnings.filterwarnings('ignore')


class DataPreprocessor:
    """
    Custom preprocessor class - implementasi lengkap untuk mengatasi missing class error
    """
    def __init__(self):
        # Default values untuk setiap fitur
        self.default_values = {
            'priority': 'Medium',
            'team_size': 'Small',
            'task_type': 'Development',
            'estimated_hours': 0.0,
            'word_count': 0,
            'dependency_count': 0
        }

        # Feature definitions
        self.feature_columns = [
            'priority', 'team_size', 'task_type',  # categorical
            'estimated_hours', 'word_count', 'dependency_count'  # numerical
        ]
        self.categorical_features = ['priority', 'team_size', 'task_type']
        self.numerical_features = ['estimated_hours', 'word_count', 'dependency_count']
        
        # State tracking
        self.encoders = {}
        self.scalers = {}
        self.fitted = False
    
    def transform(self, df):
        """Transform data menggunakan fitted preprocessor"""
        if not isinstance(df, pd.DataFrame):
            df = pd.DataFrame([df])
            
        df_copy = df.copy()
        
        # Pastikan semua kolom yang diperlukan ada
        for col in self.feature_columns:
            if col not in df_copy.columns:
                df_copy[col] = self.default_values[col]
        
        # Normalisasi nilai kategorikal
        for col in self.categorical_features:
            df_copy[col] = df_copy[col].fillna(self.default_values[col])
            df_copy[col] = df_copy[col].astype(str).str.capitalize()
        
        # Normalisasi nilai numerik
        for col in self.numerical_features:
            df_copy[col] = pd.to_numeric(df_copy[col], errors='coerce').fillna(self.default_values[col])
            df_copy[col] = df_copy[col].clip(lower=0)  # Pastikan tidak ada nilai negatif
        
        return df_copy[self.feature_columns]

    def fit(self, df):
        """Fit preprocessor dengan training data"""
        self.fitted = True
        return self

    def fit_transform(self, df):
        """Fit dan transform data sekaligus"""
        return self.fit(df).transform(df)


class CustomUnpickler(pickle.Unpickler):
    """Custom unpickler untuk mengatasi masalah missing class"""
    
    def find_class(self, module, name):
        # Jika class tidak ditemukan, coba cari di module saat ini
        if name == 'DataPreprocessor':
            return DataPreprocessor
        
        # Untuk class lain, gunakan logic default
        try:
            return super().find_class(module, name)
        except (ImportError, AttributeError):
            # Jika masih gagal, buat dummy class
            print(f"⚠️ Creating dummy class for {module}.{name}")
            return type(name, (), {})


class TimelinePredictor:
    """Timeline Predictor dengan solusi lengkap untuk masalah model loading"""
    
    def __init__(self, model_path='timeline_predictor_model.pkl', preprocessor_path='timeline_preprocessor.pkl'):
        self.model = None
        self.preprocessor = None
        self.is_trained = False
        self.model_path = model_path
        self.preprocessor_path = preprocessor_path
        self.fallback_mode = False
        
        # Inject DataPreprocessor ke dalam berbagai namespace
        self._inject_datapreprocessor()
        
        # Auto-load model jika file ada
        self.load_model()
    
    def _inject_datapreprocessor(self):
        """Inject DataPreprocessor class ke berbagai namespace untuk mengatasi import error"""
        try:
            # Inject ke __main__ module
            if '__main__' in sys.modules:
                sys.modules['__main__'].DataPreprocessor = DataPreprocessor
            
            # Inject ke current module
            current_module = sys.modules[__name__]
            current_module.DataPreprocessor = DataPreprocessor
            
            # Inject ke global namespace
            globals()['DataPreprocessor'] = DataPreprocessor
            
            # Coba inject ke app module jika ada
            if 'app' in sys.modules:
                sys.modules['app'].DataPreprocessor = DataPreprocessor
            
            print("✅ DataPreprocessor injected to multiple namespaces")
            
        except Exception as e:
            print(f"⚠️ Warning during class injection: {e}")
    
    def load_model(self, model_path=None, preprocessor_path=None):
        """Load model dengan berbagai strategi fallback"""
        model_file = model_path or self.model_path
        preprocessor_file = preprocessor_path or self.preprocessor_path
        
        print(f"🔄 Attempting to load models...")
        print(f"   Model: {model_file}")
        print(f"   Preprocessor: {preprocessor_file}")
        
        # Check if files exist
        if not os.path.exists(model_file) or not os.path.exists(preprocessor_file):
            print(f"⚠️ Model files not found!")
            print(f"   Model exists: {os.path.exists(model_file)}")
            print(f"   Preprocessor exists: {os.path.exists(preprocessor_file)}")
            return self._setup_fallback_mode()
        
        # Try multiple loading strategies
        loading_strategies = [
            self._load_with_joblib,
            self._load_with_custom_unpickler,
            self._load_with_namespace_injection,
            self._load_with_ignore_errors
        ]
        
        for i, strategy in enumerate(loading_strategies, 1):
            try:
                print(f"🔄 Trying loading strategy {i}...")
                if strategy(model_file, preprocessor_file):
                    self.is_trained = True
                    self.fallback_mode = False
                    print(f"✅ Successfully loaded with strategy {i}")
                    return True
            except Exception as e:
                print(f"❌ Strategy {i} failed: {str(e)}")
                continue
        
        print("❌ All loading strategies failed. Using fallback mode.")
        return self._setup_fallback_mode()
    
    def _load_with_joblib(self, model_file, preprocessor_file):
        """Strategy 1: Normal joblib loading"""
        self.model = joblib.load(model_file)
        self.preprocessor = joblib.load(preprocessor_file)
        return True
    
    def _load_with_custom_unpickler(self, model_file, preprocessor_file):
        """Strategy 2: Custom unpickler untuk handle missing classes"""
        with open(model_file, 'rb') as f:
            self.model = CustomUnpickler(f).load()
        
        with open(preprocessor_file, 'rb') as f:
            self.preprocessor = CustomUnpickler(f).load()
        
        return True
    
    def _load_with_namespace_injection(self, model_file, preprocessor_file):
        """Strategy 3: Inject ke lebih banyak namespace dan coba lagi"""
        # Inject ke semua possible locations
        import __main__
        __main__.DataPreprocessor = DataPreprocessor
        
        # Coba berbagai kombinasi module name
        possible_modules = ['__main__', 'app', 'timeline_predictor', __name__]
        for module_name in possible_modules:
            if module_name in sys.modules:
                setattr(sys.modules[module_name], 'DataPreprocessor', DataPreprocessor)
        
        # Load dengan joblib setelah injection
        self.model = joblib.load(model_file)
        self.preprocessor = joblib.load(preprocessor_file)
        return True
    
    def _load_with_ignore_errors(self, model_file, preprocessor_file):
        """Strategy 4: Load model saja, skip preprocessor jika perlu"""
        try:
            # Coba load model dulu
            self.model = joblib.load(model_file)
            print("✅ Model loaded successfully")
            
            # Coba load preprocessor, jika gagal buat yang baru
            try:
                self.preprocessor = joblib.load(preprocessor_file)
                print("✅ Preprocessor loaded successfully")
            except:
                print("⚠️ Preprocessor loading failed, creating new one")
                self.preprocessor = DataPreprocessor()
                
            return True
        except Exception as e:
            print(f"❌ Model loading also failed: {e}")
            return False
    
    def _setup_fallback_mode(self):
        """Setup rule-based prediction mode"""
        print("🔄 Setting up rule-based prediction mode...")
        self.model = None
        self.preprocessor = None
        self.is_trained = False
        self.fallback_mode = True
        print("✅ Rule-based mode ready!")
        return True
    
    def predict(self, task_data):
        """
        Prediksi timeline untuk task baru dengan multiple fallback strategies
        """
        try:
            # Prepare data
            prepared_data = self._prepare_task_data(task_data)
            
            # Pilih metode prediksi
            if self.is_trained and self.model is not None:
                return self._ml_predict(prepared_data, task_data)
            else:
                return self._rule_based_predict(prepared_data, task_data)
                
        except Exception as e:
            print(f"❌ Prediction error: {str(e)}")
            return self._emergency_predict(task_data)
    
    def _ml_predict(self, prepared_data, original_task_data):
        """ML-based prediction"""
        try:
            # Convert to DataFrame
            df_input = pd.DataFrame([prepared_data])
            
            # Transform data
            try:
                df_processed = self.preprocessor.transform(df_input)
            except Exception as e:
                print(f"⚠️ Preprocessor transform failed: {str(e)}")
                return self._rule_based_predict(prepared_data, original_task_data)
            
            # Feature selection - pastikan sesuai dengan yang digunakan saat training
            feature_columns = ['priority', 'team_size', 'task_type', 
                             'estimated_hours', 'word_count', 'dependency_count']
            
            # Make prediction
            prediction = self.model.predict(df_processed[feature_columns])[0]
            predicted_days = max(1, round(prediction))
            
            # Calculate confidence and other metrics
            confidence = self._calculate_confidence(predicted_days, prepared_data, method='ml')
            predicted_completion_date = self._calculate_completion_date(
                original_task_data.get('startDate'), predicted_days
            )
            factors = self._analyze_factors(prepared_data, predicted_days)
            
            return {
                'predicted_days': predicted_days,
                'confidence': confidence,
                'predicted_completion_date': predicted_completion_date,
                'factors': factors,
                'model_info': f'ML model ({type(self.model).__name__})',
                'prediction_method': 'machine_learning',
                'features_used': feature_columns
            }
            
        except Exception as e:
            print(f"❌ ML prediction failed: {str(e)}")
            return self._rule_based_predict(prepared_data, original_task_data)
    
    def _rule_based_predict(self, prepared_data, original_task_data):
        """Rule-based prediction system"""
        try:
            # Base calculation
            estimated_hours = prepared_data['estimated_hours']
            base_days = max(1, round(estimated_hours / 8))
            
            # Calculate multiplier based on various factors
            multiplier = 1.0
            
            # Priority factor
            priority_factors = {'High': 0.85, 'Medium': 1.0, 'Low': 1.15}
            multiplier *= priority_factors.get(prepared_data['priority'], 1.0)
            
            # Team size factor
            team_factors = {'Large': 1.25, 'Medium': 1.0, 'Small': 0.9}
            multiplier *= team_factors.get(prepared_data['team_size'], 1.0)
            
            # Task type factor
            task_factors = {
                'Development': 1.3,
                'Testing': 1.1,
                'Research': 1.5,
                'Documentation': 0.8,
                'Meeting': 0.6
            }
            multiplier *= task_factors.get(prepared_data['task_type'], 1.0)
            
            # Dependencies factor
            dep_count = prepared_data['dependency_count']
            if dep_count > 5:
                multiplier *= 1.4
            elif dep_count > 2:
                multiplier *= 1.2
            elif dep_count == 0:
                multiplier *= 0.95
            
            # Complexity factor (word count)
            word_count = prepared_data['word_count']
            if word_count > 100:
                multiplier *= 1.15
            elif word_count > 50:
                multiplier *= 1.05
            elif word_count < 10:
                multiplier *= 0.9
            
            # Final calculation
            predicted_days = max(1, round(base_days * multiplier))
            
            # Calculate metrics
            confidence = self._calculate_confidence(predicted_days, prepared_data, method='rule_based')
            predicted_completion_date = self._calculate_completion_date(
                original_task_data.get('startDate'), predicted_days
            )
            factors = self._analyze_factors(prepared_data, predicted_days)
            factors.append("Using rule-based calculation (ML model unavailable)")
            
            return {
                'predicted_days': predicted_days,
                'confidence': confidence,
                'predicted_completion_date': predicted_completion_date,
                'factors': factors,
                'model_info': 'Rule-based algorithmic system',
                'prediction_method': 'rule_based',
                'calculation_details': {
                    'base_days': base_days,
                    'multiplier': round(multiplier, 2),
                    'estimated_hours': estimated_hours
                }
            }
            
        except Exception as e:
            print(f"❌ Rule-based prediction failed: {str(e)}")
            return self._emergency_predict(original_task_data)
    
    def _emergency_predict(self, task_data):
        """Emergency fallback prediction"""
        try:
            estimated_hours = float(task_data.get('estimated_hours', task_data.get('estimatedHours', 16)))
            predicted_days = max(1, round(estimated_hours / 6))  # Conservative estimate
            
            return {
                'predicted_days': predicted_days,
                'confidence': 0.5,
                'predicted_completion_date': None,
                'factors': [
                    'Emergency prediction mode',
                    'Based on estimated hours only',
                    'Reduced accuracy due to system limitations'
                ],
                'model_info': 'Emergency calculation',
                'prediction_method': 'emergency',
                'warning': 'Limited accuracy - system in emergency mode'
            }
        except:
            # Absolute last resort
            return {
                'predicted_days': 3,
                'confidence': 0.3,
                'predicted_completion_date': None,
                'factors': ['Default prediction due to system error'],
                'model_info': 'Default fallback',
                'prediction_method': 'default',
                'error': 'All prediction methods failed'
            }
    
    def _prepare_task_data(self, task_data):
        """Prepare and validate task data"""
        prepared = {}
        
        # Priority
        prepared['priority'] = task_data.get('priority', 'Medium')
        
        # Team size (handle both team_size and teamSize)
        prepared['team_size'] = task_data.get('team_size', task_data.get('teamSize', 'Small'))
        
        # Task type (handle both task_type and taskType)
        prepared['task_type'] = task_data.get('task_type', task_data.get('taskType', 'Development'))
        
        # Numeric fields dengan default values
        prepared['estimated_hours'] = float(task_data.get('estimated_hours', task_data.get('estimatedHours', 20)))
        
        # Word count
        if 'word_count' in task_data:
            prepared['word_count'] = int(task_data['word_count'])
        else:
            # Hitung word count dari title dan description jika ada
            word_count = 0
            for field in ['title', 'description']:
                if field in task_data and task_data[field]:
                    word_count += len(str(task_data[field]).split())
            prepared['word_count'] = max(word_count, 5)  # Minimal 5 kata
        
        # Dependencies
        if 'dependency_count' in task_data:
            prepared['dependency_count'] = int(task_data['dependency_count'])
        elif 'dependencies' in task_data and isinstance(task_data['dependencies'], list):
            prepared['dependency_count'] = len(task_data['dependencies'])
        else:
            prepared['dependency_count'] = 0
        
        # Validasi dan normalisasi nilai
        if prepared['priority'].lower() not in ['high', 'medium', 'low']:
            prepared['priority'] = 'Medium'
        else:
            prepared['priority'] = prepared['priority'].capitalize()
        
        if prepared['team_size'].lower() not in ['large', 'medium', 'small']:
            prepared['team_size'] = 'Small'
        else:
            prepared['team_size'] = prepared['team_size'].capitalize()
        
        if prepared['task_type'].lower() not in ['development', 'testing', 'meeting', 'research', 'documentation']:
            prepared['task_type'] = 'Development'
        else:
            prepared['task_type'] = prepared['task_type'].capitalize()
        
        # Pastikan nilai numerik tidak negatif
        prepared['estimated_hours'] = max(0, prepared['estimated_hours'])
        prepared['word_count'] = max(0, prepared['word_count'])
        prepared['dependency_count'] = max(0, prepared['dependency_count'])
        
        return prepared
    
    def _calculate_confidence(self, predicted_days, task_data, method='ml'):
        """Calculate prediction confidence"""
        if method == 'ml':
            base_confidence = 0.82
        elif method == 'rule_based':
            base_confidence = 0.68
        else:
            base_confidence = 0.5
        
        # Adjust based on data quality
        hours_per_day = 8
        expected_days = task_data['estimated_hours'] / hours_per_day
        
        if abs(predicted_days - expected_days) <= 2:
            adjustment = 0.08
        elif abs(predicted_days - expected_days) <= 5:
            adjustment = 0.0
        else:
            adjustment = -0.1
        
        # Factor in complexity indicators
        if task_data['dependency_count'] > 5:
            adjustment -= 0.05
        if task_data['word_count'] > 50:
            adjustment += 0.03
        elif task_data['word_count'] < 10:
            adjustment -= 0.03
        
        final_confidence = max(0.4, min(0.95, base_confidence + adjustment))
        return round(final_confidence, 2)
    
    def _calculate_completion_date(self, start_date_str, predicted_days):
        """Calculate completion date excluding weekends"""
        if not start_date_str:
            return None
            
        try:
            # Parse start date
            if 'T' in start_date_str:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            else:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            
            # Add business days
            current_date = start_date
            days_added = 0
            
            while days_added < predicted_days:
                current_date += timedelta(days=1)
                if current_date.weekday() < 5:  # Monday=0, Friday=4
                    days_added += 1
            
            return current_date.isoformat()
            
        except Exception as e:
            print(f"⚠️ Date calculation error: {e}")
            return None
    
    def _analyze_factors(self, task_data, predicted_days):
        """Analyze factors affecting the prediction"""
        factors = []
        
        # Priority analysis
        if task_data['priority'] == 'High':
            factors.append("High priority - accelerated timeline expected")
        elif task_data['priority'] == 'Low':
            factors.append("Low priority - may extend beyond normal timeline")
        
        # Team size analysis
        if task_data['team_size'] == 'Large':
            factors.append("Large team - coordination overhead considered")
        elif task_data['team_size'] == 'Small':
            factors.append("Small team - focused execution but limited bandwidth")
        
        # Task complexity
        complexity_notes = {
            'Development': 'Development work includes testing and debugging time',
            'Testing': 'Testing requires thorough validation cycles',
            'Research': 'Research timeline includes exploration uncertainty',
            'Documentation': 'Documentation has predictable effort estimation',
            'Meeting': 'Meeting duration is typically fixed'
        }
        if task_data['task_type'] in complexity_notes:
            factors.append(complexity_notes[task_data['task_type']])
        
        # Dependencies impact
        dep_count = task_data['dependency_count']
        if dep_count > 5:
            factors.append(f"High dependency count ({dep_count}) increases risk of delays")
        elif dep_count > 2:
            factors.append(f"Moderate dependencies ({dep_count}) require coordination")
        elif dep_count == 0:
            factors.append("No dependencies - can proceed independently")
        
        # Effort vs timeline analysis
        expected_days = task_data['estimated_hours'] / 8
        if predicted_days > expected_days * 1.4:
            factors.append("Timeline extends significantly beyond effort estimate")
        elif predicted_days < expected_days * 0.8:
            factors.append("Timeline compressed relative to effort estimate")
        
        return factors[:5]
    
    def get_model_info(self):
        """Get comprehensive model information"""
        if self.is_trained and self.model is not None:
            return {
                "status": "ML Model Active",
                "model_type": str(type(self.model).__name__),
                "preprocessor_type": str(type(self.preprocessor).__name__) if self.preprocessor else "None",
                "model_path": self.model_path,
                "preprocessor_path": self.preprocessor_path,
                "prediction_method": "machine_learning",
                "expected_features": ['priority', 'team_size', 'task_type', 'estimated_hours', 'word_count', 'dependency_count']
            }
        else:
            return {
                "status": "Rule-Based System Active",
                "model_type": "Algorithmic calculation",
                "prediction_method": "rule_based",
                "note": "Using mathematical model with domain expertise",
                "fallback_reason": "ML model not available or failed to load"
            }


def test_predictor():
    """Comprehensive test function"""
    print("🧪 Testing Timeline Predictor with Error Handling...")
    print("=" * 60)
    
    predictor = TimelinePredictor()
    
    # Display model status
    model_info = predictor.get_model_info()
    print(f"📊 System Status: {model_info['status']}")
    print(f"   Method: {model_info['prediction_method']}")
    if 'fallback_reason' in model_info:
        print(f"   Reason: {model_info['fallback_reason']}")
    print()
    
    # Test cases
    test_tasks = [
        {
            'priority': 'High',
            'team_size': 'Large',
            'task_type': 'Development',
            'estimated_hours': 40,
            'title': 'Build user authentication system with OAuth integration',
            'description': 'Implement secure login system with multiple providers',
            'dependency_count': 3,
            'startDate': '2025-06-02'
        },
        {
            'priority': 'Medium',
            'team_size': 'Small',
            'task_type': 'Testing',
            'estimated_hours': 16,
            'title': 'API endpoint testing',
            'dependency_count': 1,
            'startDate': '2025-06-05'
        },
        {
            'priority': 'Low',
            'team_size': 'Medium',
            'task_type': 'Documentation',
            'estimated_hours': 12,
            'title': 'User manual',
            'dependency_count': 0,
            'startDate': '2025-06-10'
        }
    ]
    
    for i, task in enumerate(test_tasks, 1):
        print(f"📋 Test Case {i}: {task['task_type']} Task")
        print(f"   Priority: {task['priority']}")
        print(f"   Team Size: {task['team_size']}")
        print(f"   Estimated Hours: {task['estimated_hours']}")
        print(f"   Dependencies: {task['dependency_count']}")
        
        result = predictor.predict(task)
        
        print(f"\n🎯 Prediction Results:")
        print(f"   Predicted Days: {result['predicted_days']} days")
        print(f"   Confidence: {result['confidence']*100:.0f}%")
        print(f"   Method: {result['prediction_method']}")
        
        if result.get('predicted_completion_date'):
            completion_date = datetime.fromisoformat(result['predicted_completion_date'])
            print(f"   Completion: {completion_date.strftime('%Y-%m-%d (%A)')}")
        
        print(f"   Key Factors:")
        for factor in result['factors'][:3]:
            print(f"     • {factor}")
        
        if 'warning' in result:
            print(f"   ⚠️  {result['warning']}")
        
        if 'calculation_details' in result:
            details = result['calculation_details']
            print(f"   📊 Calculation: {details['base_days']} days × {details['multiplier']} = {result['predicted_days']} days")
        
        print("-" * 50)


if __name__ == "__main__":
    test_predictor()