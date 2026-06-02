import os
import sys

# Ensure backend folder is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(BASE_DIR))

from backend.nlp_engine import FAQMatcher

def test_nlp_preprocessing():
    print("=== Running NLP Preprocessing Tests ===")
    
    faq_path = os.path.join(BASE_DIR, "faq_data.json")
    matcher = FAQMatcher(faq_path)
    
    # Test 1: Lemmatization and stop words
    print("Test 1: Stopword removal and lemmatization...")
    tokens1 = matcher.preprocess("How can I reset my password?")
    print("Query: 'How can I reset my password?' -> Tokens:", tokens1)
    assert "reset" in tokens1
    assert "password" in tokens1
    assert "how" not in tokens1
    assert "i" not in tokens1
    print("[PASS] Test 1 Passed!")

    # Test 2: Singular vs Plural match
    print("\nTest 2: Lemmatization of plurals...")
    tokens2 = matcher.preprocess("Where can I find secret keys and tokens?")
    print("Query: 'Where can I find secret keys and tokens?' -> Tokens:", tokens2)
    assert "key" in tokens2  # "keys" should lemmatize to "key"
    print("[PASS] Test 2 Passed!")

    # Test 3: Cosine Similarity Matching
    print("\nTest 3: Exact & Fuzzy query intent matching...")
    
    # Exact-ish
    res1 = matcher.match("How do I reset my password?")
    print("Exact query match ID:", res1['match']['id'] if res1['match'] else "None", "Score:", res1['score'])
    assert res1['match'] is not None
    assert res1['match']['id'] == 5
    
    # Fuzzy with grammatical errors & typos
    res2 = matcher.match("forgot my password")
    print("Fuzzy query match ID:", res2['match']['id'] if res2['match'] else "None", "Score:", res2['score'])
    assert res2['match'] is not None
    assert res2['match']['id'] == 5
    
    # Out of domain query
    res3 = matcher.match("What is the speed of light?")
    print("Out-of-domain query match:", res3['match']['question'] if res3['match'] else "None", "Score:", res3['score'])
    assert res3['match'] is None
    
    print("[PASS] Test 3 Passed!")
    print("\n=== All NLP Tests Passed Successfully! ===")

if __name__ == "__main__":
    test_nlp_preprocessing()
