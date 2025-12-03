// Configuration
const API_BASE_URL = 'http://localhost:8000';

// State
let examples = [];
let currentExample = null;
let viewMode = 'full_note'; // 'full_note' or 'conversation'

// Entity type to color mapping
const entityTypeMap = {
    'Age': 'Age',
    'Biological_structure': 'Biological_structure',
    'Date': 'Date',
    'Detailed_description': 'Detailed_description',
    'Disease_disorder': 'Disease_disorder',
    'Dosage': 'Dosage',
    'Duration': 'Duration',
    'Medication': 'Medication',
    'Sex': 'Sex',
    'Sign_symptom': 'Sign_symptom',
    'Therapeutic_procedure': 'Therapeutic_procedure',
    'therapeutic_procedure': 'Therapeutic_procedure'
};

const entityTypeLabels = {
    'Age': 'Age',
    'Biological_structure': 'Biological Structure',
    'Date': 'Date',
    'Detailed_description': 'Detailed Description',
    'Disease_disorder': 'Disease/Disorder',
    'Dosage': 'Dosage',
    'Duration': 'Duration',
    'Medication': 'Medication',
    'Sex': 'Sex',
    'Sign_symptom': 'Sign/Symptom',
    'Therapeutic_procedure': 'Therapeutic Procedure'
};

// DOM Elements
const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const emptyState = document.getElementById('emptyState');
const resultsDisplay = document.getElementById('resultsDisplay');
const errorMessage = document.getElementById('errorMessage');
const taggedText = document.getElementById('taggedText');
const entityList = document.getElementById('entityList');
const entityCount = document.getElementById('entityCount');
const examplesContainer = document.getElementById('examplesContainer');
const legendGrid = document.getElementById('legendGrid');
const conversationContainer = document.getElementById('conversationContainer');
const conversationDisplay = document.getElementById('conversationDisplay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeLegend();
    loadExamples();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    analyzeBtn.addEventListener('click', handleAnalyze);
    clearBtn.addEventListener('click', handleClear);
    
    // View mode toggle
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            viewMode = e.target.value;
            displayExamples();
        });
    });
    
    // Allow Enter + Ctrl/Cmd to analyze
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleAnalyze();
        }
    });
}

// Initialize Legend
function initializeLegend() {
    const uniqueTypes = Object.keys(entityTypeLabels);
    
    legendGrid.innerHTML = uniqueTypes.map(type => `
        <div class="legend-item">
            <div class="legend-color entity-${type}"></div>
            <span class="legend-label">${entityTypeLabels[type]}</span>
        </div>
    `).join('');
}

// Load Examples
async function loadExamples() {
    try {
        const response = await fetch(`${API_BASE_URL}/examples?limit=10`);
        
        if (!response.ok) {
            throw new Error(`Failed to load examples: ${response.status}`);
        }
        
        const data = await response.json();
        examples = data.examples || [];
        
        displayExamples();
    } catch (error) {
        console.error('Error loading examples:', error);
        examplesContainer.innerHTML = `
            <div class="error-state">
                <p>Failed to load examples. Make sure the backend server is running.</p>
            </div>
        `;
    }
}

// Display Examples
function displayExamples() {
    if (examples.length === 0) {
        examplesContainer.innerHTML = `
            <div class="empty-state">
                <p>No examples available</p>
            </div>
        `;
        return;
    }
    
    examplesContainer.innerHTML = examples.map((example, index) => {
        // Get preview based on view mode
        let preview = '';
        if (viewMode === 'conversation' && example.conversation) {
            // Show first few lines of conversation
            preview = typeof example.conversation === 'string' 
                ? example.conversation.substring(0, 150) + '...'
                : 'Conversation available';
        } else {
            // Show full note preview
            preview = example.full_note.substring(0, 150) + '...';
        }
        
        return `
            <div class="example-card" data-index="${index}">
                <div class="example-header">
                    <span class="example-id">Example #${example.idx}</span>
                    <span class="example-type">${viewMode === 'conversation' ? '💬' : '📄'}</span>
                </div>
                <div class="example-preview">${escapeHtml(preview)}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.example-card').forEach(card => {
        card.addEventListener('click', () => handleExampleClick(card));
    });
}

// Handle Example Click
function handleExampleClick(card) {
    const index = parseInt(card.dataset.index);
    const example = examples[index];
    
    // Update active state
    document.querySelectorAll('.example-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    // Set text based on view mode
    currentExample = example;
    
    if (viewMode === 'conversation' && example.conversation) {
        // Load conversation text
        textInput.value = typeof example.conversation === 'string' 
            ? example.conversation 
            : JSON.stringify(example.conversation, null, 2);
        
        // Display conversation in the conversation section
        displayConversation(example.conversation);
    } else {
        // Load full note
        textInput.value = example.full_note;
        
        // Still show conversation if available
        if (example.conversation) {
            displayConversation(example.conversation);
        }
    }
    
    handleAnalyze();
}

// Handle Analyze
async function handleAnalyze() {
    const text = textInput.value.trim();
    
    if (!text) {
        showError('Please enter some text to analyze');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error analyzing text:', error);
        showError('Failed to analyze text. Make sure the backend server is running on port 8000.');
    }
}

// Handle Clear
function handleClear() {
    textInput.value = '';
    currentExample = null;
    document.querySelectorAll('.example-card').forEach(c => c.classList.remove('active'));
    conversationContainer.style.display = 'none';
    conversationDisplay.innerHTML = '';
    showEmpty();
}

// Display Results
function displayResults(data) {
    hideAllStates();
    resultsDisplay.style.display = 'block';
    
    // Display tagged text
    displayTaggedText(data);
    
    // Display entity list
    displayEntityList(data.entities);
}

// Display Tagged Text
function displayTaggedText(data) {
    const { tokens, tags } = data;
    let html = '';
    let currentText = '';
    let currentTag = 'O';
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const tag = tags[i];
        
        // Skip special tokens
        if (token === '[CLS]' || token === '[SEP]' || token === '[PAD]') {
            continue;
        }
        
        // Get entity type (remove B- or I- prefix)
        const entityType = tag.startsWith('B-') || tag.startsWith('I-') 
            ? tag.substring(2) 
            : 'O';
        
        // Handle token
        if (tag === 'O') {
            // Flush current entity
            if (currentTag !== 'O') {
                html += createEntitySpan(currentText, currentTag);
                currentText = '';
            }
            
            // Add regular token
            const tokenText = token.startsWith('##') ? token.substring(2) : ' ' + token;
            html += escapeHtml(tokenText);
            currentTag = 'O';
        } else if (tag.startsWith('B-')) {
            // Flush previous entity
            if (currentTag !== 'O') {
                html += createEntitySpan(currentText, currentTag);
            }
            
            // Start new entity
            currentText = token.startsWith('##') ? token.substring(2) : token;
            currentTag = entityType;
        } else if (tag.startsWith('I-')) {
            // Continue entity
            if (currentTag === entityType) {
                currentText += token.startsWith('##') ? token.substring(2) : ' ' + token;
            } else {
                // Tag mismatch, flush and start new
                if (currentTag !== 'O') {
                    html += createEntitySpan(currentText, currentTag);
                }
                currentText = token.startsWith('##') ? token.substring(2) : token;
                currentTag = entityType;
            }
        }
    }
    
    // Flush final entity
    if (currentTag !== 'O') {
        html += createEntitySpan(currentText, currentTag);
    }
    
    taggedText.innerHTML = html;
}

// Create Entity Span
function createEntitySpan(text, type) {
    const normalizedType = entityTypeMap[type] || type;
    return `<span class="entity-tag entity-${normalizedType}" title="${entityTypeLabels[normalizedType] || type}">${escapeHtml(text)}</span>`;
}

// Display Entity List
function displayEntityList(entities) {
    entityCount.textContent = entities.length;
    
    if (entities.length === 0) {
        entityList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No entities found</p>';
        return;
    }
    
    // Group entities by type
    const grouped = {};
    entities.forEach(entity => {
        const type = entityTypeMap[entity.type] || entity.type;
        if (!grouped[type]) {
            grouped[type] = [];
        }
        grouped[type].push(entity.text);
    });
    
    // Display grouped entities
    entityList.innerHTML = Object.keys(grouped)
        .sort()
        .map(type => {
            const items = grouped[type];
            const label = entityTypeLabels[type] || type;
            
            return `
                <div class="entity-item" style="border-left-color: var(--${type.toLowerCase().replace(/_/g, '-')})">
                    <span class="entity-type-badge entity-${type}">${label}</span>
                    <span class="entity-text">${items.join(', ')}</span>
                </div>
            `;
        }).join('');
}

// Display Conversation
function displayConversation(conversation) {
    if (!conversation) {
        conversationContainer.style.display = 'none';
        return;
    }
    
    // Parse conversation if it's a string
    let messages = [];
    if (typeof conversation === 'string') {
        // Split by common patterns like "Doctor:" and "Patient:"
        const lines = conversation.split('\n').filter(line => line.trim());
        let currentSpeaker = null;
        let currentMessage = '';
        
        lines.forEach(line => {
            const doctorMatch = line.match(/^Doctor:\s*(.+)/i);
            const patientMatch = line.match(/^Patient:\s*(.+)/i);
            
            if (doctorMatch) {
                if (currentSpeaker && currentMessage) {
                    messages.push({ speaker: currentSpeaker, text: currentMessage.trim() });
                }
                currentSpeaker = 'doctor';
                currentMessage = doctorMatch[1];
            } else if (patientMatch) {
                if (currentSpeaker && currentMessage) {
                    messages.push({ speaker: currentSpeaker, text: currentMessage.trim() });
                }
                currentSpeaker = 'patient';
                currentMessage = patientMatch[1];
            } else if (currentSpeaker) {
                currentMessage += ' ' + line;
            }
        });
        
        // Add last message
        if (currentSpeaker && currentMessage) {
            messages.push({ speaker: currentSpeaker, text: currentMessage.trim() });
        }
    }
    
    if (messages.length === 0) {
        conversationContainer.style.display = 'none';
        return;
    }
    
    conversationContainer.style.display = 'block';
    conversationDisplay.innerHTML = messages.map(msg => `
        <div class="conversation-message">
            <div class="message-label ${msg.speaker}">${msg.speaker === 'doctor' ? 'Doctor' : 'Patient'}</div>
            <div class="message-text ${msg.speaker}">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
}

// State Management
function showLoading() {
    hideAllStates();
    loadingState.style.display = 'flex';
    analyzeBtn.disabled = true;
}

function showError(message) {
    hideAllStates();
    errorState.style.display = 'flex';
    errorMessage.textContent = message;
    analyzeBtn.disabled = false;
}

function showEmpty() {
    hideAllStates();
    emptyState.style.display = 'flex';
    analyzeBtn.disabled = false;
}

function hideAllStates() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    resultsDisplay.style.display = 'none';
    analyzeBtn.disabled = false;
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
