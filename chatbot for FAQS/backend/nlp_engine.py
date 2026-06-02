import json
import math
import os
import re
import nltk

def download_nltk_resources():
    """Dynamically download required NLTK resources in a safe manner."""
    resources = [
        ('tokenizers/punkt', 'punkt'),
        ('tokenizers/punkt_tab', 'punkt_tab'),
        ('corpora/stopwords', 'stopwords'),
        ('corpora/wordnet', 'wordnet'),
        ('corpora/omw-1.4', 'omw-1.4')
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception as e:
                print(f"Warning: Could not download NLTK resource '{name}': {e}")

# Run downloader on module import
download_nltk_resources()

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

class FAQMatcher:
    def __init__(self, faq_file_path):
        self.faq_file_path = faq_file_path
        self.faqs = []
        self.lemmatizer = WordNetLemmatizer()
        
        # Load stopwords safely
        try:
            self.stop_words = set(stopwords.words('english'))
        except Exception:
            self.stop_words = set()
            
        self.vocab = []
        self.idf = {}
        self.faq_tfidf_vectors = []
        
        self.load_faqs()
        self.build_model()

    def load_faqs(self):
        """Loads FAQs from JSON database file."""
        if os.path.exists(self.faq_file_path):
            with open(self.faq_file_path, 'r', encoding='utf-8') as f:
                self.faqs = json.load(f)
        else:
            print(f"Error: FAQ file not found at {self.faq_file_path}")
            self.faqs = []

    def preprocess(self, text):
        """Cleans, tokenizes, removes stopwords, and lemmatizes input text."""
        if not text:
            return []
        
        # Lowercase and remove punctuation except apostrophes
        text = text.lower()
        text = re.sub(r"[^\w\s']", " ", text)
        
        # Tokenize
        try:
            tokens = word_tokenize(text)
        except Exception:
            tokens = text.split()
            
        # Clean and lemmatize
        cleaned_tokens = []
        for token in tokens:
            if token not in self.stop_words and not token.isdigit():
                # Lemmatize verbs and nouns
                lemma = self.lemmatizer.lemmatize(token, pos='v')
                lemma = self.lemmatizer.lemmatize(lemma, pos='n')
                cleaned_tokens.append(lemma)
                
        return cleaned_tokens

    def build_model(self):
        """Computes vocabulary, IDFs, and TF-IDF vectors for all FAQ questions."""
        if not self.faqs:
            return

        # Preprocess all questions
        all_processed_questions = []
        for faq in self.faqs:
            processed = self.preprocess(faq['question'])
            all_processed_questions.append(processed)
            
        # Compute Vocabulary
        vocab_set = set()
        for tokens in all_processed_questions:
            vocab_set.update(tokens)
        self.vocab = sorted(list(vocab_set))
        
        N = len(self.faqs)
        
        # Compute Document Frequency (DF)
        df = {term: 0 for term in self.vocab}
        for tokens in all_processed_questions:
            unique_tokens = set(tokens)
            for token in unique_tokens:
                if token in df:
                    df[token] += 1
                    
        # Compute Inverse Document Frequency (IDF)
        self.idf = {}
        for term in self.vocab:
            # Smooth IDF version: idf = ln(1 + N / (1 + df)) + 1
            self.idf[term] = math.log(1 + N / (1 + df[term])) + 1.0

        # Compute TF-IDF vectors for all questions
        self.faq_tfidf_vectors = []
        for tokens in all_processed_questions:
            vector = self._compute_tfidf_vector(tokens)
            self.faq_tfidf_vectors.append(vector)

    def _compute_tfidf_vector(self, tokens):
        """Helper to compute TF-IDF vector for a list of tokens based on model vocabulary."""
        vector = {term: 0.0 for term in self.vocab}
        
        if not tokens:
            return vector
            
        # Term Frequency (TF)
        tf = {}
        for token in tokens:
            if token in self.vocab:
                tf[token] = tf.get(token, 0) + 1
                
        # Term Frequency normalized by doc length or log scale
        # We'll use: tf[t] * idf[t]
        for term, count in tf.items():
            vector[term] = count * self.idf[term]
            
        return vector

    def _cosine_similarity(self, vec1, vec2):
        """Computes Cosine Similarity between two sparse term-frequency vectors."""
        dot_product = 0.0
        norm_a = 0.0
        norm_b = 0.0
        
        for term in self.vocab:
            val1 = vec1[term]
            val2 = vec2[term]
            dot_product += val1 * val2
            norm_a += val1 ** 2
            norm_b += val2 ** 2
            
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
            
        return dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))

    def match(self, query, threshold=0.25):
        """Matches a user query against the FAQ library.
        Returns the best matching FAQ, the similarity score, and alternative matches.
        """
        if not self.faqs:
            return {
                "match": None,
                "score": 0.0,
                "alternatives": []
            }
            
        query_tokens = self.preprocess(query)
        
        # If the query is empty after preprocessing
        if not query_tokens:
            return {
                "match": None,
                "score": 0.0,
                "alternatives": []
            }
            
        query_vector = self._compute_tfidf_vector(query_tokens)
        
        matches = []
        for idx, faq in enumerate(self.faqs):
            base_score = self._cosine_similarity(query_vector, self.faq_tfidf_vectors[idx])
            
            # Keyword matching boost
            # If the query contains any of the explicitly defined FAQ keywords, give a small boost
            keyword_matches = 0
            for kw in faq.get('keywords', []):
                # Check for word boundary matches to avoid partial matching (e.g. "hi" matching "hindi")
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', query.lower()):
                    keyword_matches += 1
                    
            boost = 0.0
            if keyword_matches > 0:
                # Add 0.08 boost per matched keyword, capped at 0.25
                boost = min(0.25, keyword_matches * 0.08)
                
            final_score = min(1.0, base_score + boost)
            
            # Save all match info
            matches.append({
                "faq": faq,
                "score": final_score,
                "base_score": base_score,
                "boost": boost
            })
            
        # Sort matches by similarity score descending
        matches = sorted(matches, key=lambda x: x['score'], reverse=True)
        
        best_match = matches[0]
        
        # Extract alternatives that have a score > 0.1 and are not the best match
        alternatives = []
        for m in matches[1:4]:
            if m['score'] > 0.1:
                alternatives.append({
                    "id": m['faq']['id'],
                    "question": m['faq']['question'],
                    "category": m['faq']['category'],
                    "score": round(m['score'], 3)
                })
                
        if best_match['score'] >= threshold:
            return {
                "match": best_match['faq'],
                "score": round(best_match['score'], 3),
                "alternatives": alternatives
            }
        else:
            # Low confidence match
            return {
                "match": None,
                "score": round(best_match['score'], 3),
                "suggested": best_match['faq'] if best_match['score'] > 0.08 else None,
                "alternatives": alternatives
            }

if __name__ == "__main__":
    # Test script if executed directly
    matcher = FAQMatcher("faq_data.json")
    print("Vocabulary size:", len(matcher.vocab))
    test_queries = [
        "How do I reset my password?",
        "Can I pay in multiple languages?",
        "forgote my pass word",
        "tell me about aura AI",
        "why is the widget not loading on my site?"
    ]
    for q in test_queries:
        res = matcher.match(q)
        print(f"\nQuery: '{q}'")
        if res['match']:
            print(f"Match: '{res['match']['question']}' (Score: {res['score']})")
        else:
            print(f"No match under threshold. (Highest Score: {res['score']})")
            if res.get('suggested'):
                print(f"Suggestion: '{res['suggested']['question']}'")
