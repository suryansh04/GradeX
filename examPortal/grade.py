
#####################################################################################################################################

# import firebase_admin
# from firebase_admin import credentials
# from firebase_admin import firestore
# import anthropic
# import asyncio
# import re
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity
# import numpy as np
# import spacy
# import textstat
# import warnings
# print("Starting the script...")

# # Initialize Firebase
# cred = credentials.Certificate("../gradex-final-firebase-adminsdk-gcz1t-1a852e7e40.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()
# print("Firebase initialized...")



# # Initialize Anthropic client
# anthropic_client = anthropic.Client(api_key="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")
# print("Anthropic client initialized...")
# # Load spaCy model
# nlp = spacy.load("en_core_web_sm")
# def enhanced_grade_answer(question, sample_answer, student_answer, max_marks):
#         # Text preprocessing
#     def preprocess(text):
#         doc = nlp(text.lower())
#         return ' '.join([token.lemma_ for token in doc if not token.is_stop and token.is_alpha])


#     processed_sample = preprocess(sample_answer)
#     processed_student = preprocess(student_answer)


#     # Advanced text similarity using TF-IDF and cosine similarity
#     vectorizer = TfidfVectorizer().fit_transform([processed_sample, processed_student])
#     cosine_sim = cosine_similarity(vectorizer[0:1], vectorizer[1:2])[0][0]
    
#     # Keyword matching with importance weighting
#     sample_keywords = set(processed_sample.split())
#     student_keywords = set(processed_student.split())
#     important_keywords = set(nlp(sample_answer).noun_chunks) | set(nlp(sample_answer).ents)
    
#     keyword_overlap = len(sample_keywords.intersection(student_keywords)) / len(sample_keywords)
#     important_keyword_overlap = len(set(str(k) for k in important_keywords).intersection(student_keywords)) / len(important_keywords)


#     with warnings.catch_warnings():
#         warnings.filterwarnings("ignore", message="The model you're using has no word vectors loaded")
#         semantic_sim = nlp(sample_answer).similarity(nlp(student_answer))

#     # Semantic similarity using spaCy
#     semantic_sim = nlp(sample_answer).similarity(nlp(student_answer))
    
#     # Length and structure analysis
#     length_ratio = min(len(student_answer) / len(sample_answer), 1.0)
#     sentence_count_ratio = min(len(list(nlp(student_answer).sents)) / len(list(nlp(sample_answer).sents)), 1.0) if sample_answer else 0
    

#     # Readability and complexity measures
#     sample_readability = textstat.flesch_reading_ease(sample_answer)
#     student_readability = textstat.flesch_reading_ease(student_answer)
#     readability_diff = abs(sample_readability - student_readability) / max(sample_readability, student_readability)
    
#     # Coherence and structure analysis
#     def get_discourse_markers(text):
#         markers = ["however", "therefore", "thus", "consequently", "in conclusion", "for example", "in contrast"]
#         return sum(1 for marker in markers if marker in text.lower())
    
#     discourse_ratio = get_discourse_markers(student_answer) / max(get_discourse_markers(sample_answer), 1)

#     # Combine metrics
#     metrics = {
#         'cosine_similarity': cosine_sim,
#         'keyword_overlap': keyword_overlap,
#         'important_keyword_overlap': important_keyword_overlap,
#         'semantic_similarity': semantic_sim,
#         'length_ratio': length_ratio,
#         'sentence_count_ratio': sentence_count_ratio,
#         'readability_similarity': 1 - readability_diff,
#         'discourse_structure': discourse_ratio
#     }
#     # Calculate weighted score
#     weights = {
#         'cosine_similarity': 0.2,
#         'keyword_overlap': 0.15,
#         'important_keyword_overlap': 0.2,
#         'semantic_similarity': 0.2,
#         'length_ratio': 0.05,
#         'sentence_count_ratio': 0.05,
#         'readability_similarity': 0.1,
#         'discourse_structure': 0.05
#     }
    
#     weighted_score = sum(metrics[key] * weights[key] for key in metrics)
#     # Apply a non-linear transformation to the score
#     transformed_score = 1 / (1 + np.exp(-10 * (weighted_score - 0.5)))
    
#     # Convert to grade
#     grade = round(transformed_score * max_marks)
    
#     # Generate feedback using Claude
#     prompt = f"""You are an experienced, compassionate university teacher who genuinely cares about your students' learning and growth. Your goal is to provide constructive, encouraging feedback that helps students understand their mistakes and improve.
# Grade the following student answer:
# Question: {question}
# Sample Answer: {sample_answer}
# Student Answer: {student_answer}
# Carefully analyze the student's answer, comparing it to the sample answer. Consider partial credit for correct steps or reasoning, even if the final answer is incorrect. 
# The algorithm has calculated the following metrics:
# Cosine Similarity: {cosine_sim:.2f}
# Keyword Overlap: {keyword_overlap:.2f}
# Length Ratio: {length_ratio:.2f}
# Readability Similarity: {1 - readability_diff:.2f}
# Overall Weighted Score: {weighted_score:.2f}
# Calculated Grade: {grade}/{max_marks}

# Provide a detailed response in the following format:
# Grade: [Use the calculated grade: {grade}/{max_marks}]
# Feedback:
# [Provide a detailed, encouraging feedback of 2-3 sentences. Start with a positive comment about what the student did well. Then, explain any errors or misconceptions clearly but gently. Offer specific suggestions for improvement. Use the calculated metrics to inform your feedback.]
# Correct Answer:
# [Provide the full correct answer, including any important steps or explanations.]
# Common Mistake:
# [Briefly explain a common mistake related to this type of problem, if applicable.]
# Learning Tip:
# [Offer a concise, helpful tip for better understanding or approaching similar problems in the future.]
# Remember to maintain a supportive and encouraging tone throughout your feedback, focusing on the student's learning journey rather than just the correctness of the answer."""

#     try:
#         response = anthropic_client.messages.create(
#             max_tokens=1024,
#             temperature=0.5,
#             messages=[
#                 {"role": "user", "content": prompt}
#             ],
#             model="claude-3-5-sonnet-20240620"
#         )
        
#         result = response.content[0].text.strip()
#         grade_match = re.search(r"Grade: (\d+)/", result)
#         feedback_match = re.search(r"Feedback:\s*(.*?)(?:Correct Answer:|$)", result, re.DOTALL)
#         correct_answer_match = re.search(r"Correct Answer:\s*(.*?)(?:Common Mistake:|Learning Tip:|$)", result, re.DOTALL)
#         common_mistake_match = re.search(r"Common Mistake:\s*(.*?)(?:Learning Tip:|$)", result, re.DOTALL)
#         learning_tip_match = re.search(r"Learning Tip:\s*(.*?)$", result, re.DOTALL)

#         grade = int(grade_match.group(1)) if grade_match else grade  # Use calculated grade if parsing fails
#         feedback = feedback_match.group(1).strip() if feedback_match else "No feedback provided."
#         correct_answer = correct_answer_match.group(1).strip() if correct_answer_match else ""
#         common_mistake = common_mistake_match.group(1).strip() if common_mistake_match else ""
#         learning_tip = learning_tip_match.group(1).strip() if learning_tip_match else ""

#         print(f"Graded answer. Grade: {grade}, Feedback: {feedback[:50]}...")  # Print first 50 chars of feedback
#         return {
#             "grade": grade,
#             "feedback": feedback,
#             "correctAnswer": correct_answer,
#             "commonMistake": common_mistake,
#             "learningTip": learning_tip,
#             "metrics": metrics
#         }
#     except Exception as e:
#         print(f"Error calling Claude API: {e}")
#         return {
#             "grade": grade,
#             "feedback": f"Error occurred while grading: {str(e)}",
#             "correctAnswer": "",
#             "commonMistake": "",
#             "learningTip": "",
#             "metrics": metrics
#         }

# async def process_student_answers():
#     print("Starting to process student answers...")
#     student_answers_ref = db.collection("studentanswers")
#     docs = student_answers_ref.get()
#     print(f"Retrieved {len(docs)} documents from Firebase.")
    
#     if len(docs) == 0:
#         print("No documents found in the 'studentanswers' collection.")
#         return

#     for doc in docs:
#         try:
#             print(f"Processing document: {doc.id}")
#             data = doc.to_dict()
#             claude_responses = []
#             for i in range(len(data["questions"])):
#                 question = data["questions"][i]
#                 sample_answer = data["sampleAnswers"][i]
#                 student_answer = data["studentanswer"][i]
#                 max_marks = data["questionMarks"][i]
#                 print(f"Grading question {i+1} for document {doc.id}")
#                 grade_result = await asyncio.to_thread(enhanced_grade_answer, question, sample_answer, student_answer, max_marks)
#                 claude_responses.append({
#                     "question": question,
#                     "correctAnswer": grade_result["correctAnswer"],
#                     "studentAnswer": student_answer,
#                     "feedback": grade_result["feedback"],
#                     "marks": grade_result["grade"],
#                     "maxMarks": max_marks,
#                     "commonMistake": grade_result["commonMistake"],
#                     "learningTip": grade_result["learningTip"],
#                     "metrics": grade_result["metrics"]
#                 })
#             print(f"Updating document {doc.id} with Claude's responses")
#             doc.reference.update({
#                 "claudeResponses": claude_responses
#             })
#             print(f"Successfully processed and updated document: {doc.id}")
#         except Exception as e:
#             print(f"Error processing document {doc.id}: {str(e)}")
#     print("Finished processing all documents.")




##################################################################################################################################

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

print("Starting the script...")

# Initialize Firebase
cred = credentials.Certificate("../gradex-final-firebase-adminsdk-gcz1t-1a852e7e40.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase initialized...")

# Initialize Anthropic client
anthropic_client = anthropic.Client(api_key="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")
print("Anthropic client initialized...")

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

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

    # Combine metrics
    metrics = {
        'cosine_similarity': cosine_sim,
        'keyword_overlap': keyword_overlap,
        'important_keyword_overlap': important_keyword_overlap,
        'semantic_similarity': semantic_sim,
        'length_ratio': length_ratio,
        'sentence_count_ratio': sentence_count_ratio,
        'readability_similarity': 1 - readability_diff,
        'discourse_structure': discourse_ratio
    }
    # Calculate weighted score
    weights = {
        'cosine_similarity': 0.2,
        'keyword_overlap': 0.15,
        'important_keyword_overlap': 0.2,
        'semantic_similarity': 0.2,
        'length_ratio': 0.05,
        'sentence_count_ratio': 0.05,
        'readability_similarity': 0.1,
        'discourse_structure': 0.05
    }
    
    weighted_score = sum(metrics[key] * weights[key] for key in metrics)
    transformed_score = 1 / (1 + np.exp(-10 * (weighted_score - 0.5)))
    grade = round(transformed_score * max_marks)

    # Generate feedback using Claude
    prompt = f"""You are an experienced, compassionate university teacher who genuinely cares about your students' learning and growth. Your goal is to provide constructive, encouraging feedback that helps students understand their mistakes and improve.
Grade the following student answer:
Question: {question}
Sample Answer: {sample_answer}
Student Answer: {student_answer}
Carefully analyze the student's answer, comparing it to the sample answer. Consider partial credit for correct steps or reasoning, even if the final answer is incorrect. 
The algorithm has calculated the following metrics:
Cosine Similarity: {cosine_sim:.2f}
Keyword Overlap: {keyword_overlap:.2f}
Length Ratio: {length_ratio:.2f}
Readability Similarity: {1 - readability_diff:.2f}
Overall Weighted Score: {weighted_score:.2f}
Calculated Grade: {grade}/{max_marks}

Based on the student's performance, assign an 'Answer Status' from the following categories: Correct, Partially Correct, Partially Incorrect, Incorrect.

Provide a detailed response in the following format:
Grade: [Use the calculated grade: {grade}/{max_marks}]
Answer Status: [Provide the answer status based on your analysis]
Feedback:
[Provide detailed, encouraging feedback..., keep the feedback to the point it should be maximum of 40 words]
Correct Answer:
[Provide the full correct answer, including any important steps or explanations.]
Common Mistake:
[Briefly explain a common mistake related to this type of problem,keep it to the point just explain main things if applicable.]
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
            model="claude-3-opus-20240229"
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
        correct_answer = correct_answer_match.group(1).strip() if correct_answer_match else ""
        common_mistake = common_mistake_match.group(1).strip() if common_mistake_match else ""
        learning_tip = learning_tip_match.group(1).strip() if learning_tip_match else ""

        print(f"Graded answer. Grade: {grade}, Answer Status: {answer_status}, Feedback: {feedback[:50]}...")  # Print first 50 chars of feedback
        return {
            "grade": grade,
            "feedback": feedback,
            "correctAnswer": correct_answer,
            "commonMistake": common_mistake,
            "learningTip": learning_tip,
            "metrics": metrics,
            "answerStatus": answer_status
        }
    except Exception as e:
        print(f"Error calling Claude API: {e}")
        return {
            "grade": grade,
            "feedback": f"Error occurred while grading: {str(e)}",
            "correctAnswer": "",
            "commonMistake": "",
            "learningTip": "",
            "metrics": metrics,
            "answerStatus": "Unknown"
        }

async def process_student_answers():
    print("Starting to process student answers...")
    student_answers_ref = db.collection("studentanswers")
    docs = student_answers_ref.get()
    print(f"Retrieved {len(docs)} documents from Firebase.")
    
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
                 # Grade the student answer using the enhanced grading function
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

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(process_student_answers())  