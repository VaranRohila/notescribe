# NoteScribe Frontend

A simple, elegant web interface for clinical Named Entity Recognition (NER) using the NoteScribe model.

## Features

- **Text Input**: Enter clinical notes manually or select from example cases
- **Example Selector**: Browse and select from 10 sample clinical notes loaded from the dataset
- **Real-time NER Analysis**: Submit text to the backend API for entity recognition
- **Visual Entity Highlighting**: See identified entities highlighted with color-coded tags
- **Entity Summary**: View grouped entities by type with counts
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
frontend/
├── index.html      # Main HTML structure
├── styles.css      # All styling and design
├── script.js       # JavaScript logic and API interaction
└── README.md       # This file
```

## Setup & Usage

### Prerequisites

1. **Backend Server Running**: The backend API must be running on `http://localhost:8000`
   ```bash
   cd backend
   python main.py
   ```

2. **CORS Enabled**: The backend must have CORS enabled for the frontend to work. Uncomment the CORS middleware in `backend/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### Running the Frontend

**Option 1: Direct File Opening**
Simply open `index.html` in your web browser:
```bash
# On Windows
start index.html

# On macOS
open index.html

# On Linux
xdg-open index.html
```

**Option 2: Using Python HTTP Server**
```bash
cd frontend
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

**Option 3: Using Live Server (VS Code)**
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## How to Use

### 1. Manual Text Input
1. Type or paste clinical text into the input box
2. Click the "🔍 Analyze Text" button
3. View the results below with highlighted entities

### 2. Using Examples
1. Look at the right panel showing example clinical notes
2. Click on any example card to load it
3. The text will automatically be analyzed
4. Results will display the identified entities

### 3. Understanding Results

**Tagged Text Section**
- Shows your input text with colored highlights for each entity type
- Hover over any highlighted entity to see its type
- Click on entities for interaction

**Entity Summary Section**
- Lists all identified entities grouped by type
- Shows the total count of entities found
- Color-coded by entity type for easy identification

## Entity Types

The model identifies the following clinical entity types:

| Entity Type | Description | Color |
|-------------|-------------|-------|
| Age | Patient age references | Yellow |
| Biological Structure | Body parts, organs | Purple |
| Date | Temporal references | Blue |
| Detailed Description | Qualitative descriptions | Green |
| Disease/Disorder | Medical conditions | Red |
| Dosage | Medication dosages | Orange |
| Duration | Time periods | Indigo |
| Medication | Drug names | Cyan |
| Sex | Gender references | Pink |
| Sign/Symptom | Clinical presentations | Pink |
| Therapeutic Procedure | Medical procedures | Green |

## Customization

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --age: #fbbf24;
    --biological-structure: #a78bfa;
    /* ... add your custom colors */
}
```

### Changing API Endpoint
Edit the configuration in `script.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

### Loading More Examples
Modify the slice limit in `script.js`:
```javascript
examples = text.trim().split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
    .slice(0, 20); // Change from 10 to 20
```

## Troubleshooting

### "Failed to analyze text" Error
- **Cause**: Backend server is not running
- **Solution**: Start the backend server on port 8000

### Examples Not Loading
- **Cause**: Path to JSONL file is incorrect
- **Solution**: Ensure the path in `script.js` points to the correct location:
  ```javascript
  const EXAMPLES_PATH = '../data/augmented-clinical-notes/augmented_notes_30K_sample.jsonl';
  ```

### CORS Errors
- **Cause**: CORS is not enabled in the backend
- **Solution**: Uncomment the CORS middleware in `backend/main.py`

### Blank Results
- **Cause**: No entities were detected in the text
- **Solution**: Try using example clinical notes which are known to contain entities

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- IE11: ❌ Not supported

## Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks or libraries
- **Fetch API**: For backend communication

## Performance

- Lightweight: ~50KB total (HTML + CSS + JS)
- No external dependencies
- Fast load times
- Efficient DOM manipulation

## Future Enhancements

Potential features for future versions:
- Export results to PDF/JSON
- Batch processing of multiple notes
- Entity relationship visualization
- Comparison between different models
- Annotation correction interface
- Search and filter entities
- Statistics dashboard

## Contributing

To contribute improvements:
1. Make your changes to the relevant files
2. Test thoroughly across browsers
3. Document any new features in this README
4. Submit your changes

## License

This frontend is part of the NoteScribe project.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify the backend is running correctly
3. Check browser console for error messages
4. Ensure all file paths are correct

---

**Note**: This is a demo interface designed for research and educational purposes. Not intended for production clinical use.
