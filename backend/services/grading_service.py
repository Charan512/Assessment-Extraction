import json
import logging
from typing import List, Optional

from groq import AsyncGroq
from config import get_settings
from models.domain import Question, Answer, AnswerMapping, GradingResult
from models.enums import EvaluationType

logger = logging.getLogger(__name__)

class GradingEvaluator:
    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncGroq(api_key=self.settings.groq_api_key) if self.settings.groq_api_key else None
        self.model = self.settings.groq_model

    async def evaluate_answer(self, question: Question, answer: Optional[Answer], marks_total: float, rubric: Optional[dict] = None) -> GradingResult:
        if not self.client:
            logger.warning("Groq API key not configured. Skipping AI evaluation.")
            return GradingResult(
                question_id=question.id,
                answer_id=answer.id if answer else None,
                is_answered=bool(answer),
                marks_awarded=0.0,
                marks_total=marks_total,
                evaluation=EvaluationType.UNANSWERED if not answer else EvaluationType.INCORRECT,
                feedback="AI Grading unavailable due to missing API key.",
                confidence=0.0
            )

        if not answer:
            return GradingResult(
                question_id=question.id,
                answer_id=None,
                is_answered=False,
                marks_awarded=0.0,
                marks_total=marks_total,
                evaluation=EvaluationType.UNANSWERED,
                feedback="No answer provided.",
                confidence=1.0
            )

        # Build prompt for Groq API
        rubric_text = f"\nGrading Rubric:\n{json.dumps(rubric, indent=2)}" if rubric else ""
        
        prompt = f"""
        You are an expert examiner grading a student's answer.
        
        Question: {question.text}
        Total Marks Available: {marks_total}
        
        Student's Answer: {answer.text}
        {rubric_text}
        
        Evaluate the student's answer based on correctness, completeness, and understanding of the topic.
        
        Respond ONLY with a valid JSON object matching this schema, with no markdown formatting or other text:
        {{
            "marks_awarded": float (between 0.0 and {marks_total}),
            "evaluation": string (must be one of: "correct", "partial", "incorrect"),
            "feedback": string (specific feedback explaining mistakes and how to improve),
            "explanation": string (internal reasoning for why these marks were awarded),
            "confidence": float (between 0.0 and 1.0 indicating how confident you are in this evaluation)
        }}
        """
        
        try:
            response = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a precise grading assistant that only outputs valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.1,
                max_tokens=1024,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
            
            # Map evaluation string to Enum
            eval_str = result_json.get("evaluation", "incorrect").lower()
            if eval_str == "correct":
                evaluation = EvaluationType.CORRECT
            elif eval_str == "partial":
                evaluation = EvaluationType.PARTIAL
            else:
                evaluation = EvaluationType.INCORRECT
                
            return GradingResult(
                question_id=question.id,
                answer_id=answer.id,
                is_answered=True,
                marks_awarded=min(float(result_json.get("marks_awarded", 0.0)), marks_total),
                marks_total=marks_total,
                evaluation=evaluation,
                feedback=result_json.get("feedback", "No specific feedback provided."),
                explanation=result_json.get("explanation", ""),
                confidence=float(result_json.get("confidence", 0.8))
            )
            
        except Exception as e:
            logger.error(f"Error evaluating answer with Groq API: {e}")
            return GradingResult(
                question_id=question.id,
                answer_id=answer.id,
                is_answered=True,
                marks_awarded=0.0,
                marks_total=marks_total,
                evaluation=EvaluationType.INCORRECT,
                feedback="Error occurred during AI grading.",
                explanation=str(e),
                confidence=0.0
            )

    async def evaluate_all_answers(self, questions: List[Question], mappings: List[AnswerMapping], answers: List[Answer], rubric: Optional[dict] = None) -> List[GradingResult]:
        results = []
        answer_dict = {a.id: a for a in answers}
        
        for q in questions:
            # Find the mapped answer for this question
            mapped_answer_id = next((m.answer_id for m in mappings if m.question_id == q.id), None)
            student_answer = answer_dict.get(mapped_answer_id) if mapped_answer_id else None
            
            marks_total = q.marks if q.marks is not None else 10.0 # Default fallback
            
            result = await self.evaluate_answer(q, student_answer, marks_total, rubric)
            results.append(result)
            
        return results

    def calculate_summary(self, grading_results: List[GradingResult]) -> dict:
        total_awarded = sum(r.marks_awarded for r in grading_results)
        total_possible = sum(r.marks_total for r in grading_results)
        
        correct_count = sum(1 for r in grading_results if r.evaluation == EvaluationType.CORRECT)
        partial_count = sum(1 for r in grading_results if r.evaluation == EvaluationType.PARTIAL)
        incorrect_count = sum(1 for r in grading_results if r.evaluation == EvaluationType.INCORRECT)
        unanswered_count = sum(1 for r in grading_results if r.evaluation == EvaluationType.UNANSWERED)
        
        percentage = (total_awarded / total_possible * 100) if total_possible > 0 else 0.0
        
        return {
            "total_marks_awarded": total_awarded,
            "total_marks_possible": total_possible,
            "percentage": round(percentage, 1),
            "grade": self.calculate_grade(percentage),
            "statistics": {
                "correct": correct_count,
                "partial": partial_count,
                "incorrect": incorrect_count,
                "unanswered": unanswered_count,
                "total_questions": len(grading_results)
            }
        }

    def calculate_grade(self, percentage: float) -> str:
        if percentage >= 90:
            return "A"
        elif percentage >= 80:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"
