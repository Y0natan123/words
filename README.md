# Word Memory Learning Application

A full-stack web application for learning and memorizing English words with Hebrew translations, featuring AI-powered difficulty assessment and sentence generation.

## Features

### Core Features
- **Word Management**: View, edit, and delete English words with Hebrew translations
- **Bulk Import**: Admin-only bulk word import from TXT files
- **Progress Tracking**: Track learning progress with a 0-5 level system
- **Difficulty Assessment**: AI-powered automatic difficulty level assessment
- **Practice Mode**: Interactive flashcards for learning and review
- **Statistics**: Comprehensive learning analytics and progress visualization
- **Mobile Responsive**: Optimized for mobile devices

### AI Integration
- **Automatic Difficulty Assessment**: AI analyzes word complexity and assigns difficulty levels
- **Word Suggestions**: Get AI-recommended words based on difficulty level
- **Sentence Generation**: AI creates example sentences using learned words

## Technology Stack

### Backend
- **Node.js** with Express.js
- **OpenAI API** for AI features
- **RESTful API** architecture

### Frontend
- **React.js** with functional components and hooks
- **React Router** for navigation
- **Axios** for API communication
- **CSS Grid & Flexbox** for responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Hugging Face API key

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wordGame
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
   ```

4. **Get Hugging Face API Key**
   - Visit [Hugging Face Settings](https://huggingface.co/settings/tokens)
   - Create a new API token
   - Add it to your `.env` file

## Running the Application

### Development Mode
```bash
# Run both server and client concurrently
npm run dev

# Or run them separately:
npm run server    # Backend on port 5000
npm run client    # Frontend on port 3000
```

### Production Build
```bash
# Build the React app
npm run build

# Start production server
npm start
```

## API Endpoints

### Words Management
- `GET /api/words` - Get all words
- `POST /api/words` - Add new word
- `PUT /api/words/:id` - Update word
- `DELETE /api/words/:id` - Delete word
- `POST /api/words/:id/progress` - Update user progress
- `GET /api/words/progress/stats` - Get progress statistics

### AI Features
- `POST /api/ai/assess-difficulty` - Assess word difficulty
- `POST /api/ai/generate-sentences` - Generate example sentences
- `POST /api/ai/suggest-words` - Get word suggestions

## Usage Guide

### Admin Word Import
1. Navigate to `/admin` page
2. Enter admin key: `UNL`
3. Upload a TXT file with words in format: `english_word hebrew_translation`
4. Preview the parsed words
5. Click "Import Words" to add all words with AI-assessed difficulty levels

### Practice Mode
1. Go to "Practice" page
2. Select practice mode (All, New, Learning, Review)
3. Use flashcards to learn words
4. Show/hide answers as needed
5. Update your progress level
6. Generate example sentences with AI

### Tracking Progress
- **Level 0**: Not started
- **Level 1-4**: Learning in progress
- **Level 5**: Mastered

### Statistics
- View overall progress
- See word distribution by level and difficulty
- Track recent additions and top performers

## Data Structure

### Word Object
```javascript
{
  id: "uuid",
  english: "word",
  hebrew: "מילה",
  userLevel: 0, // 0-5 scale
  difficulty: 1, // 1-5 scale
  createdAt: "timestamp"
}
```

## Mobile Optimization

The application is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Swipe gestures for navigation
- Optimized layouts for small screens
- Fast loading times

## Future Enhancements

- [ ] User authentication and profiles
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Spaced repetition algorithm
- [ ] Audio pronunciation
- [ ] Export/import word lists
- [ ] Multiple language support
- [ ] Offline functionality
- [ ] Gamification features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository. 