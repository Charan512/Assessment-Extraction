# AI Assessment Extraction & Answer Mapping

This is an intelligent web application that enables teachers to upload question papers and student answer sheets, automatically extract and map answers to questions, and provide grading feedback with visual highlighting.

## Core Features

- **File Upload & Processing:** Accept question papers and answer sheets (PDF or images) with clear processing progress.
- **Question Extraction:** Extract all questions while preserving original numbering and hierarchical structure.
- **Answer Extraction:** Extract handwritten answers, identify which question each answer corresponds to, and locate answers even if written out of order.
- **Answer Mapping & Display:** Display questions and answers side by side, highlighting the exact region of the answer on the answer sheet when a question is selected.
- **Grading & AI Feedback:** AI-powered evaluation providing scores, correct/incorrect assessments, and detailed feedback per question.

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI
- **Language:** Python 3
- **AI/ML:** Groq API (LLaMA-3) for grading and semantic matching, TrOCR/Tesseract for text extraction
- **File Processing:** PyPDF2, pdf2image, OpenCV

## Project Structure

```
.
├── backend/               # FastAPI Python backend
│   ├── api/               # API routes
│   ├── core/              # Core configuration and exceptions
│   ├── models/            # Pydantic models
│   ├── services/          # Business logic and AI integrations
│   ├── storage/           # In-memory session storage
│   └── utils/             # Helper functions for PDF/Image processing
│
└── frontend/              # Next.js React frontend
    ├── app/               # Next.js App Router pages
    ├── components/        # Reusable UI components
    └── lib/               # API clients and utilities
```

## Setup Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **Tesseract OCR** (System dependency for text extraction)
  - Mac: `brew install tesseract`
  - Linux: `sudo apt-get install tesseract-ocr`

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Run the server
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment variables (optional, defaults to localhost:8000)
cp .env.example .env.local

# Run the development server
npm run dev
```
The frontend will run on `http://localhost:3000`.

## Architecture & Data Flow

1. **Upload:** User uploads question paper + answer sheet.
2. **Processing:** Backend extracts questions and answers using OCR/AI vision and generates bounding boxes.
3. **Display:** Frontend displays extracted data with side-by-side view.
4. **Interaction:** Clicking a question highlights the corresponding handwritten answer on the sheet.
5. **Grading:** Backend uses Groq API to evaluate answers and provide feedback.
