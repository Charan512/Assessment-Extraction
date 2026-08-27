import pytest
import asyncio
from models.domain import Question, Answer, AnswerMapping, GradingResult
from models.enums import EvaluationType
from services.grading_service import GradingEvaluator

@pytest.fixture
def grading_evaluator():
    # Will need a valid key or mock for client
    return GradingEvaluator()

def test_calculate_grade(grading_evaluator):
    assert grading_evaluator.calculate_grade(95) == "A"
    assert grading_evaluator.calculate_grade(85) == "B"
    assert grading_evaluator.calculate_grade(75) == "C"
    assert grading_evaluator.calculate_grade(65) == "D"
    assert grading_evaluator.calculate_grade(50) == "F"

def test_calculate_summary(grading_evaluator):
    results = [
        GradingResult(marks_awarded=10, marks_total=10, evaluation=EvaluationType.CORRECT),
        GradingResult(marks_awarded=5, marks_total=10, evaluation=EvaluationType.PARTIAL),
        GradingResult(marks_awarded=0, marks_total=10, evaluation=EvaluationType.INCORRECT)
    ]
    summary = grading_evaluator.calculate_summary(results)
    assert summary["total_marks_awarded"] == 15
    assert summary["total_marks_possible"] == 30
    assert summary["percentage"] == 50.0
    assert summary["grade"] == "F"
    assert summary["statistics"]["correct"] == 1
    assert summary["statistics"]["partial"] == 1
    assert summary["statistics"]["incorrect"] == 1
