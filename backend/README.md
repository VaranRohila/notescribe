# NoteScribe API

Lightweight REST API for Clinical Named Entity Recognition.

## Quick Start

```bash
cd src
pip install -r requirements.txt
python main.py
```

Server runs at `http://localhost:8000`

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | API status |
| POST | `/predict` | Extract entities from text |
| GET | `/labels` | List available entity types |

## Usage

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient is a 45-year-old male with diabetes and hypertension."}'
```

**Response:**
```json
{
  "entities": [
    {"text": "45-year-old", "type": "Age"},
    {"text": "male", "type": "Sex"},
    {"text": "diabetes", "type": "Disease_disorder"},
    {"text": "hypertension", "type": "Disease_disorder"}
  ],
  "tokens": [...],
  "tags": [...]
}
```

## Entity Types

- Age, Sex, Date, Duration
- Disease_disorder, Sign_symptom
- Medication, Dosage
- Biological_structure, Therapeutic_procedure
- Detailed_description

## API Docs

Interactive docs: `http://localhost:8000/docs`
