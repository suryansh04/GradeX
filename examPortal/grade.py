import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import anthropic
import asyncio
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import spacy
import textstat
import warnings
import ast
import difflib
import nltk
from nltk.util import ngrams
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from transformers import BertTokenizer, BertModel
import torch

print("Starting the script...")

# Initialize Firebase
cred = credentials.Certificate("./gradex-final-firebase-adminsdk-gcz1t-67221911b1.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase initialized...")

# Initialize Anthropic client
anthropic_client = anthropic.Client(api_key="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")
print("Anthropic client initialized...")

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Initialize BERT model and tokenizer
bert_model = BertModel.from_pretrained('bert-base-uncased')
bert_tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
print("BERT model and tokenizer initialized...")


def preprocess_text(text):
    # Remove extra whitespace, newlines, and convert to lowercase
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

def calculate_containment(text1, text2, n):
    tokens1 = nltk.word_tokenize(text1)
    tokens2 = nltk.word_tokenize(text2)
    
    ngrams1 = set(ngrams(tokens1, n))
    ngrams2 = set(ngrams(tokens2, n))
    
    intersection = ngrams1.intersection(ngrams2)
    containment = len(intersection) / len(ngrams1) if ngrams1 else 0
    
    return containment

def extract_features(text1, text2):
    return [calculate_containment(text1, text2, n) for n in range(1, 11)]




# Simulated dataset for plagiarism detection (you would replace this with actual data)
data = [
    ("This is the original text.", "orig"),
    ("This is the original text.", "cut"),
    ("This is a slightly modified text.", "light"),
    ("This text has been heavily modified but keeps the main idea.", "heavy"),
    ("This is a completely different text.", "non")
]

def convert_to_native(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, dict):
        return {key: convert_to_native(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(item) for item in obj]
    else:
        return obj
    
# Preprocess the data
preprocessed_data = [(preprocess_text(text), label) for text, label in data]

# Extract features
X = []
y = []
for text, label in preprocessed_data:
    features = extract_features(text, preprocessed_data[0][0])  # Compare with original text
    X.append(features)
    y.append(label)

# Convert labels to numerical values
label_map = {'orig': -1, 'non': 0, 'heavy': 1, 'light': 2, 'cut': 3}
y = [label_map[label] for label in y]

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a classifier (using Naive Bayes for simplicity)
clf = MultinomialNB()
clf.fit(X_train, y_train)

def check_plagiarism(text, original_text):
    preprocessed_text = preprocess_text(text)
    preprocessed_original = preprocess_text(original_text)
    features = extract_features(preprocessed_text, preprocessed_original)
    prediction = clf.predict([features])[0]
    plagiarism_level = list(label_map.keys())[list(label_map.values()).index(prediction)]
    
    # Calculate similarity
    similarity = sum(features) / len(features)
    
    return plagiarism_level, similarity

def get_bert_embedding(text):
    inputs = bert_tokenizer(text, return_tensors="pt", max_length=512, truncation=True, padding=True)
    with torch.no_grad():
        outputs = bert_model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

def enhanced_grade_answer(question, sample_answer, student_answer, max_marks):
    # Text preprocessing
    def preprocess(text):
        doc = nlp(text.lower()) 
        return ' '.join([token.lemma_ for token in doc if not token.is_stop and token.is_alpha])

    processed_sample = preprocess(sample_answer)
    processed_student = preprocess(student_answer)

    # Advanced text similarity using TF-IDF and cosine similarity
    vectorizer = TfidfVectorizer().fit_transform([processed_sample, processed_student])
    cosine_sim = cosine_similarity(vectorizer[0:1], vectorizer[1:2])[0][0]
    
    # Keyword matching with importance weighting
    sample_keywords = set(processed_sample.split())
    student_keywords = set(processed_student.split())
    important_keywords = set(nlp(sample_answer).noun_chunks) | set(nlp(sample_answer).ents)
    
    keyword_overlap = len(sample_keywords.intersection(student_keywords)) / len(sample_keywords)
    important_keyword_overlap = len(set(str(k) for k in important_keywords).intersection(student_keywords)) / len(important_keywords)

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="The model you're using has no word vectors loaded")
        semantic_sim = nlp(sample_answer).similarity(nlp(student_answer))

    # Length and structure analysis
    length_ratio = min(len(student_answer) / len(sample_answer), 1.0)
    sentence_count_ratio = min(len(list(nlp(student_answer).sents)) / len(list(nlp(sample_answer).sents)), 1.0) if sample_answer else 0

    # Readability and complexity measures
    sample_readability = textstat.flesch_reading_ease(sample_answer)
    student_readability = textstat.flesch_reading_ease(student_answer)
    readability_diff = abs(sample_readability - student_readability) / max(sample_readability, student_readability)
    
    # Coherence and structure analysis
    def get_discourse_markers(text):
        markers = ["however", "therefore", "thus", "consequently", "in conclusion", "for example", "in contrast"]
        return sum(1 for marker in markers if marker in text.lower())
    
    discourse_ratio = get_discourse_markers(student_answer) / max(get_discourse_markers(sample_answer), 1)

    # BERT similarity
    sample_embedding = get_bert_embedding(sample_answer)
    student_embedding = get_bert_embedding(student_answer)
    bert_similarity = cosine_similarity([sample_embedding], [student_embedding])[0][0]

    # Combine metrics
    metrics = {
        'cosine_similarity': cosine_sim,
        'keyword_overlap': keyword_overlap,
        'important_keyword_overlap': important_keyword_overlap,
        'semantic_similarity': semantic_sim,
        'length_ratio': length_ratio,
        'sentence_count_ratio': sentence_count_ratio,
        'readability_similarity': 1 - readability_diff,
        'discourse_structure': discourse_ratio,
        'bert_similarity': bert_similarity
    }
    # Calculate weighted score
    weights = {
        'cosine_similarity': 0.15,
        'keyword_overlap': 0.1,
        'important_keyword_overlap': 0.15,
        'semantic_similarity': 0.15,
        'length_ratio': 0.05,
        'sentence_count_ratio': 0.05,
        'readability_similarity': 0.1,
        'discourse_structure': 0.05,
        'bert_similarity': 0.2
    }
    
    weighted_score = sum(metrics[key] * weights[key] for key in metrics)
    transformed_score = 1 / (1 + np.exp(-10 * (weighted_score - 0.5)))
    grade = round(transformed_score * max_marks)

    # Plagiarism check
    plagiarism_level, similarity = check_plagiarism(student_answer, sample_answer)
    
    if plagiarism_level in ['cut', 'light']:
        grade = 0
        feedback = f"Potential plagiarism detected. Plagiarism level: {plagiarism_level}, Similarity: {similarity:.2f}. Please submit original work."
        answer_status = "Plagiarized"
    else:
        # Generate feedback using Claude
        prompt = f"""You are an experienced, compassionate university teacher who genuinely cares about your students' learning and growth. Your goal is to provide constructive, encouraging feedback that helps students understand their mistakes and improve.
Grade the following student answer:
Question: {question}
Correct Answer: {sample_answer}
Student Answer: {student_answer}
Carefully analyze the student's answer, comparing it to the Correct answer. Consider partial credit for correct steps or reasoning, even if the final answer is incorrect. 
The algorithm has calculated the following metrics:
Cosine Similarity: {cosine_sim:.2f}
Keyword Overlap: {keyword_overlap:.2f}
Length Ratio: {length_ratio:.2f}
Readability Similarity: {1 - readability_diff:.2f}
BERT Similarity: {bert_similarity:.2f}
Overall Weighted Score: {weighted_score:.2f}
Calculated Grade: {grade}/{max_marks}

Based on the student's performance, assign an 'Answer Status' from the following categories: Correct, Partially Correct, Partially Incorrect, Incorrect.

Provide a detailed response in the following format:
Grade: [Use the calculated grade: {grade}/{max_marks}]
Answer Status: [Provide the answer status based on your analysis]
Feedback:
[Provide detailed, encouraging feedback..., keep the feedback to the point it and also tell me why have deducted marks if you have and it should be maximum of 60 words]
Correct Answer:
[Provide the full correct answer, including any important steps or explanations.]
Common Mistake:
[Briefly explain a common mistake related to this type of problem,keep it to the point  if applicable.]
Learning Tip:
[Offer a concise, helpful tip for better understanding or approaching similar problems in the future.]
Remember to maintain a supportive and encouraging tone throughout your feedback, focusing on the student's learning journey rather than just the correctness of the answer."""
    try:
        response = anthropic_client.messages.create(
            max_tokens=1024,
            temperature=0.5,
            messages=[
                {"role": "user", "content": prompt}
            ],
            model="claude-3-5-sonnet-20240620"
        )
        
        result = response.content[0].text.strip()
        grade_match = re.search(r"Grade: (\d+)/", result)
        status_match = re.search(r"Answer Status:\s*(.*?)(?:Feedback:|$)", result, re.DOTALL)
        feedback_match = re.search(r"Feedback:\s*(.*?)(?:Correct Answer:|$)", result, re.DOTALL)
        correct_answer_match = re.search(r"Correct Answer:\s*(.*?)(?:Common Mistake:|Learning Tip:|$)", result, re.DOTALL)
        common_mistake_match = re.search(r"Common Mistake:\s*(.*?)(?:Learning Tip:|$)", result, re.DOTALL)
        learning_tip_match = re.search(r"Learning Tip:\s*(.*?)$", result, re.DOTALL)

        grade = int(grade_match.group(1)) if grade_match else grade  # Use calculated grade if parsing fails
        answer_status = status_match.group(1).strip() if status_match else "Unknown"
        feedback = feedback_match.group(1).strip() if feedback_match else "No feedback provided."
        correct_answer = correct_answer_match.group(1).strip() if correct_answer_match else sample_answer
        common_mistake = common_mistake_match.group(1).strip() if common_mistake_match else ""
        learning_tip = learning_tip_match.group(1).strip() if learning_tip_match else ""

    except Exception as e:
        print(f"Error calling Claude API: {e}")
        grade = 0  # Assign a default grade
        feedback = f"Error occurred while grading: {str(e)}"
        answer_status = "Error"
        correct_answer = sample_answer
        common_mistake = ""
        learning_tip = ""

    print(f"Graded answer. Grade: {grade}, Answer Status: {answer_status}, Feedback: {feedback[:50]}...")  # Print first 50 chars of feedback
    result = {
        "grade": grade,
        "feedback": feedback,
        "sampleAnswer": correct_answer,
        "commonMistake": common_mistake,
        "learningTip": learning_tip,
        "metrics": metrics,
        "answerStatus": answer_status,
        "plagiarismStatus": f"Plagiarism level: {plagiarism_level}, Similarity: {similarity:.2f}"
    }
    return convert_to_native(result)
async def process_student_answers():
    print("Starting to process student answers...")
    student_answers_ref = db.collection("studentanswers")
    
    try:
        docs = student_answers_ref.get()
        print(f"Retrieved {len(docs)} documents from Firebase.")
    except Exception as e:
        print(f"Error retrieving documents from Firebase: {e}")
        return
    
    if len(docs) == 0:
        print("No documents found in the 'studentanswers' collection.")
        return

    for doc in docs:
        try:
            print(f"Processing document: {doc.id}")
            data = doc.to_dict()
            claude_responses = []
            for i in range(len(data["questions"])):
                question = data["questions"][i]
                sample_answer = data["sampleAnswers"][i]
                student_answer = data["studentanswer"][i]
                max_marks = data["questionMarks"][i]
                print(f"Grading question {i+1} for document {doc.id}")
                
                # Grade the student answer using the enhanced grading function with plagiarism check
                grading_result = enhanced_grade_answer(
                    question=question,
                    sample_answer=sample_answer,
                    student_answer=student_answer,
                    max_marks=max_marks
                )
                
                # Store the result for this specific question
                claude_responses.append(grading_result)

            # Update the document in Firestore with the grading results
            db.collection("studentanswers").document(doc.id).update({
                "gradedResponses": claude_responses
            })

            print(f"Grading completed for document: {doc.id}")

        except Exception as e:
            print(f"Error processing document {doc.id}: {e}")

