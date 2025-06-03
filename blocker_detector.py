import re
import nltk
import numpy as np
import joblib
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import traceback

# Download NLTK resources
try:
    print("Downloading NLTK resources...")
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    print("✅ NLTK resources downloaded successfully!")
except Exception as e:
    print(f"❌ Error downloading NLTK resources: {str(e)}")
    print(traceback.format_exc())

class BlockerDetector:
    def __init__(self):
        """Inisialisasi detector blocker dengan model ML."""
        try:
            print("\n=== Loading Blocker Detection Models ===")
            print("Loading blocker_model_only.pkl...")
            # Load model ML yang sudah dilatih
            self.model = joblib.load('blocker_model_only.pkl')
            print("✅ blocker_model_only.pkl loaded successfully!")
            
            print("\nLoading blocker_classifier_model.pkl...")
            # Load metadata model (opsional, untuk informasi tambahan)
            self.model_data = joblib.load('blocker_classifier_model.pkl')
            print("✅ blocker_classifier_model.pkl loaded successfully!")
            
            print("\nModel type:", type(self.model))
            print("Model steps:", self.model.named_steps if hasattr(self.model, 'named_steps') else "No steps found")
            
            # Verifikasi model
            if not hasattr(self.model, 'predict_proba'):
                raise ValueError("Model tidak memiliki method predict_proba")
            
            # Verifikasi vectorizer
            if hasattr(self.model, 'named_steps') and 'tfidf' in self.model.named_steps:
                vectorizer = self.model.named_steps['tfidf']
                if not hasattr(vectorizer, 'vocabulary_'):
                    raise ValueError("TF-IDF vectorizer belum di-fit")
            
            print("=== Models Loaded Successfully! ===\n")
            
        except Exception as e:
            print("\n❌ Error loading model:")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print("\nFull traceback:")
            print(traceback.format_exc())
            raise

    def detect_blockers(self, text, threshold=0.5):
        """Mendeteksi blocker dari teks."""
        # Default response untuk error case
        default_response = {
            "is_blocker": False,
            "confidence": 0.0,
            "flagged_phrases": [],
            "recommendation": "Error dalam analisis",
            "probabilities": {
                "not_blocker": 1.0,
                "blocker": 0.0
            }
        }

        if not text:
            return default_response

        try:
            # Verifikasi model sebelum prediksi
            if not hasattr(self.model, 'predict_proba'):
                print("Error: Model tidak memiliki method predict_proba")
                return default_response

            # Verifikasi vectorizer
            if hasattr(self.model, 'named_steps') and 'tfidf' in self.model.named_steps:
                vectorizer = self.model.named_steps['tfidf']
                if not hasattr(vectorizer, 'vocabulary_'):
                    print("Error: TF-IDF vectorizer belum di-fit")
                    return default_response

            # Langsung gunakan teks asli, karena model sudah include preprocessor
            probabilities = self.model.predict_proba([text])[0]
            blocker_probability = float(probabilities[1])  # Probabilitas untuk kelas blocker
            is_blocker = blocker_probability >= threshold

            # Generate rekomendasi
            recommendation = self._generate_recommendation(blocker_probability, is_blocker)

            # Identifikasi frasa yang berkontribusi
            flagged_phrases = []
            if hasattr(self.model, 'named_steps') and 'tfidf' in self.model.named_steps:
                vectorizer = self.model.named_steps['tfidf']
                transformed = vectorizer.transform([text])
                feature_names = vectorizer.get_feature_names_out()
                # Ambil kata-kata dengan skor tertinggi
                scores = transformed.toarray()[0]
                word_scores = list(zip(feature_names, scores))
                # Sort berdasarkan skor dan ambil top 5
                word_scores = sorted(word_scores, key=lambda x: x[1], reverse=True)
                flagged_phrases = [word for word, score in word_scores[:5] if score > 0]

            return {
                "is_blocker": is_blocker,
                "confidence": blocker_probability,
                "flagged_phrases": flagged_phrases,
                "recommendation": recommendation,
                "probabilities": {
                    "not_blocker": float(probabilities[0]),
                    "blocker": float(probabilities[1])
                }
            }

        except Exception as e:
            print(f"Error dalam prediksi: {str(e)}")
            print(traceback.format_exc())
            return default_response

    def _generate_recommendation(self, confidence, is_blocker):
        """Generate recommendation based on model prediction."""
        if not is_blocker:
            return "Task ini tidak terdeteksi memiliki blocker."

        if confidence >= 0.8:
            return ("Task ini terdeteksi memiliki blocker serius. "
                    "Disarankan untuk segera melakukan eskalasi atau diskusi tim.")
        elif confidence >= 0.6:
            return ("Task ini kemungkinan mengalami hambatan. "
                    "Disarankan untuk melakukan follow-up dengan assignee.")
        else:
            return ("Task ini mungkin mengalami hambatan ringan. "
                    "Perlu ditinjau dalam update progress berikutnya.")

if __name__ == "__main__":
    detector = BlockerDetector()

    # Contoh teks
    test_text = "Saya masih menunggu response dari tim backend sebelum bisa melanjutkan task ini."

    # Deteksi blocker
    result = detector.detect_blockers(test_text)
    print(f"Is Blocker: {result['is_blocker']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"Flagged Phrases: {result['flagged_phrases']}")
    print(f"Recommendation: {result['recommendation']}")
    print(f"Probabilities: {result['probabilities']}")
