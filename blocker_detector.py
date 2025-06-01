"""
Blocker Detector - Model sederhana untuk mendeteksi potensi hambatan project
dari komentar dan deskripsi task.
"""

import re
import nltk
import numpy as np
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Download NLTK resources
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Kata-kata yang mengindikasikan blocker (dalam Bahasa Indonesia dan Inggris)
BLOCKER_KEYWORDS = [
    # Indonesia
    "terhambat", "susah","tertunda", "menunggu", "butuh bantuan", "tidak bisa dilanjutkan",
    "kendala", "masalah", "blocker", "terkendala", "tertahan", "belum bisa", 
    "belum selesai", "belum tersedia", "menghambat", "menunggu persetujuan",
    "kesulitan", "gagal", "error", "stuck", "buntu", "bingung", "perlu akses",
    "perlu dibantu", "tolong bantu", "ada rintangan", "tidak dapat melanjutkan",
    
    # English
    "blocked", "waiting", "dependency", "need help", "cannot proceed",
    "obstacle", "issue", "problem", "stalled", "pending", "delayed", 
    "assistance required", "failed", "error", "stuck", "blocker", "urgent",
    "need access", "need approval", "need review", "cannot continue", "roadblock",
    "bottleneck", "need assistance", "question", "concern", "difficult"
]

# Frase negasi yang dapat membalikkan arti
NEGATION_WORDS = [
    # Indonesia
    "tidak", "bukan", "tanpa", "jangan", "belum", "sudah tidak",
    
    # English
    "not", "no", "never", "without", "don't", "doesn't", "didn't", "won't", 
    "wouldn't", "can't", "cannot", "couldn't", "shouldn't", "isn't", "aren't",
    "wasn't", "weren't"
]

# Kata-kata resolusi yang mengindikasikan bahwa blocker sudah teratasi
RESOLUTION_KEYWORDS = [
    # Indonesia
    "sudah selesai", "teratasi", "diselesaikan", "sudah tidak menunggu", 
    "sudah terjawab", "berhasil", "beres", "fixed", "solve", "terselesaikan",
    
    # English
    "resolved", "fixed", "solved", "completed", "done", "working now", 
    "no longer blocked", "unblocked", "finished", "addressed", "cleared"
]

class BlockerDetector:
    def __init__(self):
        """Inisialisasi detector blocker."""
        # Memvektorisasi kata-kata blocker sebagai referensi
        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words=stopwords.words('english') + stopwords.words('indonesian'),
            ngram_range=(1, 3)
        )
        
        # Berikan bobot lebih pada keyword blocker
        self.blocker_keywords_extended = BLOCKER_KEYWORDS + BLOCKER_KEYWORDS + BLOCKER_KEYWORDS
        self.blocker_matrix = self.vectorizer.fit_transform(self.blocker_keywords_extended)
        
        # Memvektorisasi kata-kata resolusi
        self.resolution_vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words=stopwords.words('english') + stopwords.words('indonesian'),
            ngram_range=(1, 3)
        )
        self.resolution_matrix = self.resolution_vectorizer.fit_transform(RESOLUTION_KEYWORDS)
        
        print("BlockerDetector initialized successfully!")
    
    def preprocess_text(self, text):
        """Preprocessing teks untuk analisis."""
        if not text:
            return ""
        
        # Lowercase dan hapus karakter khusus
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Tokenisasi dan join kembali
        tokens = word_tokenize(text)
        return ' '.join(tokens)
    
    def detect_blockers(self, text, threshold=0.2):
        """
        Mendeteksi apakah teks mengandung indikasi blocker.
        
        Args:
            text: Teks yang akan dianalisis
            threshold: Batas minimal similarity untuk mendeteksi blocker
            
        Returns:
            dict: Hasil deteksi dengan format:
                {
                    "is_blocker": bool,
                    "confidence": float,
                    "flagged_phrases": list,
                    "recommendation": str
                }
        """
        if not text:
            return {
                "is_blocker": False,
                "confidence": 0.0,
                "flagged_phrases": [],
                "recommendation": ""
            }
        
        # Preprocessing teks
        processed_text = self.preprocess_text(text)
        
        # Extract phrases untuk analisis detail
        phrases = self._extract_potential_phrases(processed_text)
        sentences = sent_tokenize(text)
        
        # Vectorize teks yang sudah diproses
        try:
            text_vector = self.vectorizer.transform([processed_text])
        except:
            # Jika teks tidak bisa divektorisasi karena kata-kata baru
            # Update vocabulary dan vectorize ulang
            self.vectorizer = TfidfVectorizer(
                lowercase=True, 
                stop_words=stopwords.words('english') + stopwords.words('indonesian'),
                ngram_range=(1, 3)
            )
            combined_texts = self.blocker_keywords_extended + [processed_text]
            self.blocker_matrix = self.vectorizer.fit_transform(self.blocker_keywords_extended)
            text_vector = self.vectorizer.transform([processed_text])
        
        # Hitung similarity dengan kata-kata blocker
        similarities = cosine_similarity(text_vector, self.blocker_matrix)
        max_similarity = np.max(similarities)
        
        # Identifikasi frasa yang terdeteksi sebagai blocker
        flagged_phrases = []
        if max_similarity >= threshold:
            flagged_phrases = self._identify_flagged_phrases(phrases)
            
            # Periksa konteks kalimat untuk menangkap frasa yang lebih bermakna
            if not flagged_phrases and sentences:
                for sentence in sentences:
                    sentence_vector = self.vectorizer.transform([self.preprocess_text(sentence)])
                    sentence_sim = np.max(cosine_similarity(sentence_vector, self.blocker_matrix))
                    if sentence_sim >= threshold:
                        flagged_phrases.append(sentence.strip())
        
        # Cek apakah ada kata negasi yang membalikkan arti
        has_negation = self._check_negation(processed_text)
        
        # Jika ada negasi dan hanya ada sedikit flag, kemungkinan bukan blocker
        if has_negation and len(flagged_phrases) <= 2:
            max_similarity = max_similarity * 0.5  # Kurangi confidence
        
        # Cek apakah ada indikasi resolusi (blocker sudah teratasi)
        # Tetapi hanya jika tidak ada flagged_phrases yang terdeteksi sebagai blocker
        if not flagged_phrases:
            is_resolved = self._check_resolution(processed_text)
            if is_resolved:
                return {
                    "is_blocker": False,
                    "confidence": 0.0,
                    "flagged_phrases": [],
                    "recommendation": "Tampaknya hambatan sudah teratasi."
                }
        
        # Generate rekomendasi
        recommendation = self._generate_recommendation(max_similarity, flagged_phrases)
        
        return {
            "is_blocker": max_similarity >= threshold,
            "confidence": float(max_similarity),
            "flagged_phrases": flagged_phrases,
            "recommendation": recommendation
        }
    
    def _extract_potential_phrases(self, text, window_size=4):
        """Extract potential phrases from text for detailed analysis."""
        words = text.split()
        phrases = []
        
        for i in range(len(words)):
            for j in range(1, min(window_size + 1, len(words) - i + 1)):
                phrase = ' '.join(words[i:i+j])
                phrases.append(phrase)
                
        return phrases
    
    def _identify_flagged_phrases(self, phrases, threshold=0.3):
        """Identify which phrases triggered the blocker detection."""
        flagged = []
        
        for phrase in phrases:
            # Vectorize phrase
            try:
                phrase_vector = self.vectorizer.transform([phrase])
                similarities = cosine_similarity(phrase_vector, self.blocker_matrix)
                max_sim = np.max(similarities)
                
                if max_sim >= threshold:
                    flagged.append(phrase)
            except:
                # Skip phrases that can't be vectorized
                continue
                
        # Remove duplicates and overlapping phrases
        return self._remove_overlapping_phrases(flagged)
    
    def _remove_overlapping_phrases(self, phrases):
        """Remove overlapping phrases, keeping only the longest ones."""
        if not phrases:
            return []
            
        # Sort by length (longest first)
        sorted_phrases = sorted(phrases, key=len, reverse=True)
        result = []
        
        for phrase in sorted_phrases:
            # Check if this phrase is contained in any of the result phrases
            if not any(phrase in r for r in result):
                result.append(phrase)
                
        return result[:5]  # Limit to max 5 phrases
    
    def _check_negation(self, text):
        """Check if the text contains negation words that might reverse the meaning."""
        for word in NEGATION_WORDS:
            if f" {word} " in f" {text} ":
                return True
        return False
    
    def _check_resolution(self, text):
        """Check if the text indicates that a blocker has been resolved."""
        try:
            text_vector = self.resolution_vectorizer.transform([text])
            similarities = cosine_similarity(text_vector, self.resolution_matrix)
            max_similarity = np.max(similarities)
            
            # Tingkatkan threshold dari 0.4 menjadi 0.65 agar tidak terlalu sensitif
            return max_similarity > 0.65  # Threshold for resolution detection
        except:
            return False
    
    def _generate_recommendation(self, confidence, flagged_phrases):
        """Generate recommendation based on detection results."""
        if not flagged_phrases:
            return ""
            
        if confidence >= 0.6:
            return ("Task ini terdeteksi memiliki blocker serius. "
                    "Disarankan untuk segera melakukan eskalasi atau diskusi tim.")
        elif confidence >= 0.4:
            return ("Task ini kemungkinan mengalami hambatan. "
                    "Disarankan untuk melakukan follow-up dengan assignee.")
        else:
            return ("Task ini mungkin mengalami hambatan ringan. "
                    "Perlu ditinjau dalam update progress berikutnya.")
    
    def analyze_comments(self, comments):
        """
        Analyze comments to detect blockers and their chronological progression.
        
        Args:
            comments: List of comment objects with 'content' and 'createdAt' fields
            
        Returns:
            dict: Analysis result with overall assessment and individual comment analysis
        """
        if not comments:
            return {
                "is_blocker": False,
                "confidence": 0.0,
                "flagged_phrases": [],
                "recommendation": ""
            }
        
        # Sort comments by creation time (newest first)
        sorted_comments = sorted(comments, key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Analyze the most recent comments with more weight
        overall_blocker = False
        overall_confidence = 0.0
        all_flagged_phrases = []
        
        # Check if the most recent comment indicates resolution
        if sorted_comments and 'content' in sorted_comments[0]:
            most_recent = self.detect_blockers(sorted_comments[0]['content'])
            if self._check_resolution(sorted_comments[0]['content']):
                return {
                    "is_blocker": False,
                    "confidence": 0.0,
                    "flagged_phrases": [],
                    "recommendation": "Tampaknya hambatan terbaru sudah teratasi berdasarkan komentar terakhir."
                }
        
        # Analyze all comments with decreasing weight by recency
        weight_factor = 1.0
        weight_decay = 0.7  # Each older comment has 70% of the previous weight
        
        for comment in sorted_comments:
            if 'content' not in comment or not comment['content']:
                continue
                
            result = self.detect_blockers(comment['content'])
            
            # Apply recency weighting
            weighted_confidence = result['confidence'] * weight_factor
            
            # Update overall assessment
            if weighted_confidence > overall_confidence:
                overall_confidence = weighted_confidence
                overall_blocker = result['is_blocker']
                
            # Collect unique flagged phrases
            all_flagged_phrases.extend(result['flagged_phrases'])
            
            # Decay weight for older comments
            weight_factor *= weight_decay
        
        # Get unique phrases
        unique_phrases = list(set(all_flagged_phrases))
        
        # Generate recommendation
        recommendation = self._generate_recommendation(overall_confidence, unique_phrases)
        
        return {
            "is_blocker": overall_blocker,
            "confidence": float(overall_confidence),
            "flagged_phrases": unique_phrases[:5],  # Limit to 5 phrases
            "recommendation": recommendation
        }

# Contoh penggunaan
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