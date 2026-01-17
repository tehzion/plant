# SEA Plant Disease Detector 🌿

AI-powered plant disease detection for Southeast Asian crops including rice, vegetables, fruits, palm, rubber, and durian.

## Features

- 📷 **Camera & Upload**: Take photos or upload images of plants
- 🤖 **AI Detection**: OpenAI Vision API analyzes plant diseases
- 📊 **Detailed Results**: Disease identification with confidence levels
- 💊 **Treatment Recommendations**: Immediate actions and prevention tips
- 📋 **Scan History**: Local storage of past scans
- 📚 **Disease Encyclopedia**: Comprehensive database of SEA plant diseases
- 📱 **PWA Ready**: Install on mobile devices for easy access

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory and add your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

## Usage

1. **Select Plant Category**: Choose the type of plant (Rice, Vegetables, Fruits, etc.)
2. **Capture/Upload Image**: Take a photo or upload an existing image
3. **Analyze**: Click "Analyze Plant" to detect diseases
4. **View Results**: See disease identification, severity, and treatment recommendations
5. **Access History**: View past scans in the History tab
6. **Browse Encyclopedia**: Learn about common SEA plant diseases

## Technology Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **AI**: OpenAI Vision API (GPT-4 Vision)
- **Styling**: Vanilla CSS with custom design system
- **Storage**: Browser LocalStorage
- **PWA**: Service Worker for offline support

## Project Structure

```
Plant/
├── public/
│   ├── manifest.json
│   └── service-worker.js
├── src/
│   ├── components/
│   │   ├── CameraUpload.jsx
│   │   ├── PlantCategorySelector.jsx
│   │   ├── DiseaseResult.jsx
│   │   ├── TreatmentRecommendations.jsx
│   │   ├── ScanHistoryCard.jsx
│   │   └── DiseaseCard.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Results.jsx
│   │   ├── History.jsx
│   │   └── Encyclopedia.jsx
│   ├── utils/
│   │   ├── diseaseDetection.js
│   │   └── localStorage.js
│   ├── data/
│   │   └── diseaseDatabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── package.json
└── vite.config.js
```

## Important Notes

### API Costs
Each image analysis consumes OpenAI API credits. Monitor your usage at https://platform.openai.com/usage

### Browser Compatibility
- Camera API requires HTTPS (or localhost for development)
- PWA features work best on modern browsers (Chrome, Safari, Edge)

### Data Privacy
- All scan history is stored locally in your browser
- No data is sent to external servers except OpenAI for analysis
- Clear browser data will delete scan history

## Disease Database

The app includes information on common SEA plant diseases:

- **Rice**: Blast, Brown Spot, Bacterial Leaf Blight, Sheath Blight
- **Vegetables**: Leaf Curl Virus, Powdery Mildew, Bacterial Wilt
- **Fruits**: Anthracnose, Fruit Fly Damage, Black Spot
- **Palm/Rubber**: Ganoderma, Leaf Blight, Tapping Panel Dryness
- **Durian**: Phytophthora, Stem Canker, Root Rot

## Future Enhancements

- Offline AI model for areas with limited internet
- Multi-language support (Thai, Vietnamese, Indonesian, etc.)
- Weather integration for disease risk prediction
- Community features for sharing treatments
- Export scan reports as PDF

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues or questions, please check the OpenAI API documentation or create an issue in the repository.
