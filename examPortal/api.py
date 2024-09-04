from flask import Flask, jsonify
from flask_cors import CORS
import asyncio
from grade import process_student_answers 

app = Flask(__name__)
CORS(app)  # This allows your frontend to make requests to this API

@app.route('/run-grading', methods=['POST'])
def run_grading():
    try:
        # Run the grading process
        asyncio.run(process_student_answers())
        return jsonify({"message": "Grading process completed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)