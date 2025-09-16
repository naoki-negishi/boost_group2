# Literature Manager - Developer Guide

## 📁 Project Structure

```
literature-manager/
├── manifest.json          # Extension configuration and permissions
├── popup.html             # Main UI interface (popup window)
├── popup.js              # Main frontend logic and UI handling
├── background.js         # Background service worker (API calls & data processing)
├── content.js           # Content script (web page interaction)
├── api-interfaces.js    # API interface definitions and mock implementations
└── icons/              # Extension icons
```

## 🏗️ Architecture Overview

### Frontend Layer (UI)
- **popup.html**: Extension popup interface
- **popup.js**: UI logic, event handling, user interactions

### Backend Layer (Data Processing)
- **background.js**: Service worker handling API calls and data management
- **api-interfaces.js**: API interface definitions and fallback implementations

### Integration Layer
- **content.js**: Detects academic papers on web pages
- **manifest.json**: Extension configuration

---

## 🔧 Core Components

### 1. popup.js - Frontend Controller
**Location**: `popup.js`
**Purpose**: Handles all UI interactions and coordinates with background services

**Key Classes/Functions**:
```javascript
class LiteratureManager {
    // Main UI controller
    handleFileUpload()     // File upload UI handling
    showPaperDetail()      // Paper detail popup
    performSearch()        // Search functionality
    displayClusters()      // Cluster visualization
}
```

### 2. background.js - Background Service
**Location**: `background.js`
**Purpose**: Handles API calls, data processing, and storage management

**Key Classes/Functions**:
```javascript
class BackgroundService {
    analyzeDocument()      // PDF analysis API calls
    performClustering()    // Clustering algorithm calls
    fetchRelatedWork()     // Related paper discovery
    generateSummary()      // Summary generation
}
```

### 3. content.js - Web Integration
**Location**: `content.js`
**Purpose**: Detects academic papers on websites and provides quick actions

**Key Functions**:
```javascript
detectAcademicPapers()    // Detect papers on academic sites
handlePDFDownload()       // Monitor PDF downloads
injectHelperUI()          // Show quick-save interface
```

---

## 🔌 API Integration Points

### 📍 Where to Modify API Endpoints

#### Primary Location: `background.js`
```javascript
class BackgroundService {
    constructor() {
        this.apiBaseUrl = 'https://your-aws-api.com'; // 👈 CHANGE THIS
        this.apiKey = 'YOUR_API_KEY';                 // 👈 CHANGE THIS
    }
}
```

#### API Interface Definitions: `api-interfaces.js`
```javascript
class LiteratureAPI {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://your-aws-api.com'; // 👈 CHANGE THIS
        this.apiKey = config.apiKey || 'YOUR_API_KEY';               // 👈 CHANGE THIS
    }
}
```

### 🎯 API Endpoints to Implement

#### 1. Document Analysis API
**Endpoint**: `POST /v1/analyze`
**Called from**: `background.js -> analyzeDocument()`
**Purpose**: Extract text, metadata, and generate summaries from PDF

**Request Format**:
```javascript
{
    "file_data": "base64_encoded_pdf_content",
    "file_name": "paper.pdf",
    "file_type": "pdf",
    "options": {
        "extract_text": true,
        "extract_metadata": true,
        "generate_summary": true,
        "identify_keywords": true,
        "analyze_structure": true,
        "extract_references": true
    }
}
```

**Expected Response Format**:
```javascript
{
    "document_id": "unique_document_id",
    "extracted_metadata": {
        "title": "Paper Title",
        "authors": ["Author 1", "Author 2"],
        "abstract": "Paper abstract text...",
        "references": ["ref1", "ref2"]
    },
    "extracted_keywords": ["keyword1", "keyword2"],
    "generated_summary": "AI-generated summary text...",
    "key_findings": ["Finding 1", "Finding 2"],
    "confidence_score": 0.85,
    "document_info": {
        "page_count": 12,
        "word_count": 5000,
        "language": "en",
        "type": "academic_paper"
    },
    "processing_time": 5.2,
    "api_version": "1.0"
}
```

#### 2. Clustering API
**Endpoint**: `POST /v1/cluster`
**Called from**: `background.js -> performClustering()`
**Purpose**: Group papers by similarity and research topics

**Request Format**:
```javascript
{
    "papers": [
        {
            "id": "paper_1",
            "title": "Paper Title",
            "abstract": "Abstract text",
            "keywords": ["keyword1", "keyword2"],
            "summary": "Summary text",
            "authors": ["Author 1"]
        }
    ],
    "clustering_options": {
        "algorithm": "hierarchical",    // "kmeans", "dbscan", "hierarchical"
        "similarity_threshold": 0.7,
        "max_clusters": 10,
        "min_cluster_size": 2,
        "feature_extraction": "tfidf"   // "tfidf", "word2vec", "bert"
    }
}
```

**Expected Response Format**:
```javascript
{
    "clusters": [
        {
            "cluster_id": "cluster_1",
            "cluster_name": "Machine Learning",
            "description": "Papers related to ML algorithms",
            "paper_ids": ["paper_1", "paper_3"],
            "representative_keywords": ["ml", "algorithm", "neural"],
            "cohesion_score": 0.82,
            "size": 5
        }
    ],
    "algorithm_used": "hierarchical",
    "parameters": {"threshold": 0.7},
    "execution_time": 2.5,
    "silhouette_score": 0.68,
    "inertia": null
}
```

#### 3. Related Work Discovery API
**Endpoint**: `POST /v1/related-work`
**Called from**: `background.js -> fetchRelatedWork()`
**Purpose**: Find papers related to user's research interests

**Request Format**:
```javascript
{
    "research_interests": ["machine learning", "nlp", "computer vision"],
    "search_options": {
        "limit": 20,
        "time_range": "30d",           // "7d", "30d", "90d", "1y"
        "sources": ["arxiv", "pubmed", "ieee", "acm"],
        "sort_by": "relevance",        // "relevance", "date", "citations"
        "min_citation_count": 0
    }
}
```

**Expected Response Format**:
```javascript
{
    "papers": [
        {
            "paper_id": "related_1",
            "title": "Related Paper Title",
            "authors": ["Author 1", "Author 2"],
            "venue": "Conference/Journal Name",
            "year": 2024,
            "url": "https://paper-url.com",
            "abstract": "Paper abstract...",
            "keywords": ["keyword1", "keyword2"],
            "relevance_score": 0.95,
            "citation_count": 150,
            "published_date": "2024-01-15T00:00:00Z",
            "source": "arxiv",
            "doi": "10.1000/182"
        }
    ]
}
```

#### 4. Text-to-Speech API (Optional)
**Endpoint**: `POST /v1/text-to-speech`
**Called from**: `background.js -> generateAudioSummary()`
**Purpose**: Convert paper summaries to audio

**Request Format**:
```javascript
{
    "text": "Summary text to convert to speech...",
    "voice_options": {
        "voice_id": "neural_voice_1",
        "speed": 1.0,
        "pitch": 1.0,
        "language": "en-US",
        "format": "mp3"
    }
}
```

**Expected Response Format**:
```javascript
{
    "audio_url": "https://s3-bucket.com/generated-audio.mp3",
    "duration": 45.2,
    "file_size": 1024000,
    "expires_at": "2024-01-20T10:00:00Z"
}
```

---

## 💾 Data Storage Structure

### Chrome Storage Format
**Location**: `chrome.storage.local`
**Managed by**: `background.js` and `popup.js`

```javascript
{
    "papers": [
        {
            "id": "unique_paper_id",
            "title": "Paper Title",
            "authors": ["Author 1", "Author 2"],
            "abstract": "Abstract text...",
            "keywords": ["keyword1", "keyword2"],
            "summary": "AI-generated summary",
            "findings": ["Finding 1", "Finding 2"],
            "confidence_score": 0.85,
            "metadata": {
                "page_count": 12,
                "word_count": 5000,
                "language": "en",
                "document_type": "academic_paper",
                "references": []
            },
            "processing_info": {
                "processed_date": "2024-01-15T10:30:00Z",
                "processing_time": 5.2,
                "api_version": "1.0"
            },
            "file_info": {
                "original_name": "paper.pdf",
                "size": 2048576,
                "type": "application/pdf"
            }
        }
    ],
    "clusters": [
        {
            "id": "cluster_1",
            "name": "Machine Learning",
            "description": "Papers related to ML",
            "color": "#FF6B6B",
            "papers": ["paper_id_1", "paper_id_2"],
            "keywords": ["ml", "algorithm"],
            "similarity_score": 0.8,
            "created_date": "2024-01-15T10:30:00Z"
        }
    ],
    "settings": {
        "autoCluster": true,
        "clusterThreshold": 0.7,
        "apiEndpoint": "https://your-api.com",
        "audioSummary": true,
        "relatedWorkFrequency": "daily"
    },
    "userPreferences": {
        "researchInterests": ["ml", "nlp"],
        "preferredVenues": ["NIPS", "ICML"],
        "language": "en"
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
}
```

---

## 🔄 Function Flow & Logic

### 1. File Upload Process
```
User clicks "Select Files" 
    ↓
popup.js: handleFileUpload() 
    ↓
background.js: analyzeDocument() 
    ↓
API Call: POST /v1/analyze 
    ↓
background.js: processAnalysisResult() 
    ↓
Storage: Save to chrome.storage.local 
    ↓
popup.js: Update UI with results
```

### 2. Clustering Process
```
User clicks "Cluster" or Auto-triggered 
    ↓
popup.js: performClustering() 
    ↓
background.js: performClustering() 
    ↓
API Call: POST /v1/cluster 
    ↓
background.js: processClusteringResult() 
    ↓
Storage: Save clusters to chrome.storage.local 
    ↓
popup.js: displayClusters() & updateClustersPreview()
```

### 3. Search Process
```
User types in search box 
    ↓
popup.js: performSearch() 
    ↓
Filter papers by: title, authors, keywords, abstract 
    ↓
Apply cluster filter if selected 
    ↓
popup.js: displaySearchResults() 
    ↓
User clicks paper → showPaperDetail()
```

### 4. Related Work Discovery
```
User clicks "Daily Related Work" 
    ↓
popup.js: fetchRelatedWork() 
    ↓
background.js: fetchRelatedWork() 
    ↓
API Call: POST /v1/related-work 
    ↓
popup.js: Display results in related popup
```

---

## 🛠️ Development & Debugging

### Setting up Development Environment

1. **Load Extension**:
   ```bash
   # Open Chrome and go to chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked" and select project folder
   ```

2. **API Configuration**:
   ```javascript
   // In background.js, update:
   this.apiBaseUrl = 'http://localhost:3000'; // Your local API
   this.apiKey = 'your-dev-api-key';
   ```

### Debugging Tools

#### 1. Extension Console
```bash
# Right-click extension icon → "Inspect popup"
# Or go to chrome://extensions/ → "Inspect views: popup"
```

#### 2. Background Script Console
```bash
# Go to chrome://extensions/
# Find your extension → "Inspect views: background page"
```

#### 3. Content Script Console
```bash
# Open any webpage → F12 → Console
# Content script logs will appear here
```

### Common Debugging Commands

```javascript
// Check storage data
chrome.storage.local.get(null).then(console.log);

// Clear all data
chrome.storage.local.clear();

// Check current papers
console.log(window.literatureManager?.currentPapers);

// Check API endpoints
console.log(backgroundService?.apiBaseUrl);
```

### Mock API for Testing

The extension includes mock implementations in `api-interfaces.js`:

```javascript
// Switch to mock mode for testing
const mockAPI = new MockLiteratureAPI({
    mockDelay: 1000 // Simulate API delay
});
```

### Error Handling & Fallbacks

1. **API Failure**: Automatically falls back to mock implementations
2. **Network Issues**: Uses local processing where possible
3. **Storage Errors**: Gracefully handles storage quota issues
4. **File Processing**: Provides feedback on unsupported file types

### Testing Checklist

- [ ] File upload works (PDF selection)
- [ ] Mock analysis results display
- [ ] Clustering creates visual groups
- [ ] Search filters papers correctly
- [ ] Popup open/close functions work
- [ ] Storage saves data persistently
- [ ] Related work shows mock results
- [ ] Export functions generate files

---

## 🚀 Deployment Notes

### Before Production:
1. Replace all mock API endpoints with real URLs
2. Implement proper authentication
3. Add error monitoring
4. Test with large file uploads
5. Optimize for performance
6. Add user onboarding

### API Requirements:
- RESTful endpoints with JSON responses
- Base64 file upload support
- Authentication (API keys or OAuth)
- Rate limiting handling
- Error response standardization

---

## 📞 Support & Questions

For API-related questions:
- Check `api-interfaces.js` for expected request/response formats
- Test with mock implementations first
- Verify endpoint URLs and authentication
- Check background script console for API errors

For Frontend issues:
- Check popup console for JavaScript errors
- Verify event listeners are properly bound
- Test storage read/write operations
- Ensure CSP compliance (no inline scripts)