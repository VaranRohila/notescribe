"""NoteScribe API - Clinical NER Backend"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch
from typing import List


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup"""
    load_model()
    yield


app = FastAPI(
    title="NoteScribe API",
    description="Clinical Named Entity Recognition API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model configuration
MODEL_PATH = "models/rebalanced_finetuned_ClinicalBERT"
UNIQUE_TAGS = [
    "B-Age", "B-Biological_structure", "B-Date", "B-Detailed_description",
    "B-Disease_disorder", "B-Dosage", "B-Duration", "B-Medication",
    "B-Sex", "B-Sign_symptom", "B-Therapeutic_procedure", "B-therapeutic_procedure",
    "I-Age", "I-Biological_structure", "I-Date", "I-Detailed_description",
    "I-Disease_disorder", "I-Dosage", "I-Duration", "I-Medication",
    "I-Sex", "I-Sign_symptom", "I-Therapeutic_procedure", "I-therapeutic_procedure",
    "O"
]

# Global model and tokenizer
model = None
tokenizer = None
device = None


def load_model():
    """Load the NER model and tokenizer"""
    global model, tokenizer, device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()


def apply_label_annealing(tags: List[str]) -> List[str]:
    """Apply heuristics to correct BIO tagging errors"""
    corrected_tags = tags.copy()
    
    # Fix: B- followed by I- of different type
    for i in range(len(corrected_tags) - 1):
        if corrected_tags[i].startswith("B-") and corrected_tags[i+1].startswith("I-"):
            curr_type = corrected_tags[i][2:]
            next_type = corrected_tags[i+1][2:]
            if curr_type != next_type:
                corrected_tags[i] = "B-" + next_type
    
    # Fix: O tags between B-/I- and I- of same type
    i = 0
    while i < len(corrected_tags) - 2:
        if corrected_tags[i].startswith(("B-", "I-")):
            start_type = corrected_tags[i][2:]
            j = i + 1
            while j < len(corrected_tags) and corrected_tags[j] == "O":
                j += 1
            if j < len(corrected_tags) and corrected_tags[j].startswith("I-"):
                end_type = corrected_tags[j][2:]
                if start_type == end_type:
                    for k in range(i + 1, j):
                        corrected_tags[k] = "I-" + start_type
            i = j
        else:
            i += 1
    return corrected_tags


def extract_entities(tokens: List[str], tags: List[str]) -> List[dict]:
    """Extract entities from tokens and BIO tags"""
    entities = []
    current_entity = None
    
    for token, tag in zip(tokens, tags):
        if token in ["[CLS]", "[SEP]", "[PAD]"]:
            continue
            
        if tag.startswith("B-"):
            if current_entity:
                entities.append(current_entity)
            current_entity = {
                "text": token.replace("##", ""),
                "type": tag[2:],
                "tokens": [token]
            }
        elif tag.startswith("I-") and current_entity:
            if token.startswith("##"):
                current_entity["text"] += token[2:]
            else:
                current_entity["text"] += " " + token
            current_entity["tokens"].append(token)
        else:
            if current_entity:
                entities.append(current_entity)
                current_entity = None
    
    if current_entity:
        entities.append(current_entity)
    
    return entities


class PredictionRequest(BaseModel):
    text: str


class Entity(BaseModel):
    text: str
    type: str


class PredictionResponse(BaseModel):
    entities: List[Entity]
    tokens: List[str]
    tags: List[str]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "NoteScribe NER API is running"}


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Generate NER predictions for clinical text"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        # Tokenize input
        encoding = tokenizer(
            request.text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        )
        
        input_ids = encoding["input_ids"].to(device)
        attention_mask = encoding["attention_mask"].to(device)
        
        # Get predictions
        with torch.no_grad():
            outputs = model(input_ids, attention_mask=attention_mask)
            pred_ids = outputs.logits.argmax(-1).squeeze().tolist()
        
        # Handle single token case
        if isinstance(pred_ids, int):
            pred_ids = [pred_ids]
        
        # Convert to tags
        pred_tags = [UNIQUE_TAGS[pid] if pid < len(UNIQUE_TAGS) else "O" for pid in pred_ids]
        pred_tags = apply_label_annealing(pred_tags)
        
        # Get tokens
        tokens = tokenizer.convert_ids_to_tokens(encoding["input_ids"].squeeze().tolist())
        
        # Extract entities
        entities = extract_entities(tokens, pred_tags)
        
        return PredictionResponse(
            entities=[Entity(text=e["text"], type=e["type"]) for e in entities],
            tokens=tokens,
            tags=pred_tags
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/labels")
async def get_labels():
    """Get available entity labels"""
    labels = sorted(set(tag[2:] for tag in UNIQUE_TAGS if tag.startswith("B-")))
    return {"labels": labels}


@app.get("/examples")
async def get_examples(limit: int = 10):
    """Get example clinical notes from the dataset"""
    import json
    from pathlib import Path
    
    examples_path = Path(__file__).parent.parent / "data" / "augmented-clinical-notes" / "augmented_notes_30K_sample.jsonl"
    
    if not examples_path.exists():
        raise HTTPException(status_code=404, detail="Examples file not found")
    
    examples = []
    try:
        with open(examples_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if i >= limit:
                    break
                if line.strip():
                    examples.append(json.loads(line))
        return {"examples": examples, "count": len(examples)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading examples: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
