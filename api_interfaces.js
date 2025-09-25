/**
 * API Interface Definitions for Literature Manager
 * This file contains all the API interface definitions and mock implementations
 * Replace mock implementations with actual AWS API calls
 */
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;
const {LanguageServiceClient} = require('@google-cloud/language').v2;
const {VertexAI} = require('@google-cloud/vertexai');

class LiteratureAPI {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://your-aws-api.com';
        this.apiKey = config.apiKey || 'YOUR_API_KEY';
        this.region = config.region || 'us-west-2';
        this.timeout = config.timeout || 30000; // 30 seconds
    }

    /**
     * Document Analysis API
     * Analyzes uploaded PDF and extracts metadata, summary, keywords
     */
    async analyzeDocument(fileData, fileName, options = {}) {
        const endpoint = `${this.baseUrl}/v1/analyze`;
        
        const requestBody = {
            file_data: fileData,
            file_name: fileName,
            file_type: 'pdf',
            options: {
                extract_text: true,
                extract_metadata: true,
                generate_summary: true,
                identify_keywords: true,
                analyze_structure: true,
                extract_references: true,
                ...options
            }
        };

        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return this.formatAnalysisResponse(response);
        } catch (error) {
            console.error('Document analysis API error:', error);
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    /**
     * Clustering API
     * Performs clustering analysis on a collection of papers
     */
    async performClustering(papers, options = {}) {
        const endpoint = `${this.baseUrl}/v1/cluster`;
        
        const requestBody = {
            papers: papers.map(paper => ({
                id: paper.id,
                title: paper.title,
                abstract: paper.abstract,
                keywords: paper.keywords,
                summary: paper.summary,
                authors: paper.authors
            })),
            clustering_options: {
                algorithm: 'hierarchical', // 'kmeans', 'dbscan', 'hierarchical'
                similarity_threshold: 0.7,
                max_clusters: 10,
                min_cluster_size: 2,
                feature_extraction: 'tfidf', // 'tfidf', 'word2vec', 'bert'
                ...options
            }
        };

        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return this.formatClusteringResponse(response);
        } catch (error) {
            console.error('Clustering API error:', error);
            throw new Error(`Clustering analysis failed: ${error.message}`);
        }
    }

    /**
     * Related Work Discovery API
     * Finds papers related to user's research interests
     */
    async fetchRelatedWork(interests, options = {}) {
        const endpoint = `${this.baseUrl}/v1/related-work`;
        
        const requestBody = {
            research_interests: interests,
            search_options: {
                limit: 20,
                time_range: '30d', // '7d', '30d', '90d', '1y'
                sources: ['arxiv', 'pubmed', 'ieee', 'acm', 'scholar'],
                sort_by: 'relevance', // 'relevance', 'date', 'citations'
                min_citation_count: 0,
                ...options
            }
        };

            const keywords = (data.papers || []).map(p => p.keywords);

            if (!keywords) {
              alert("No keywords found from saved papers.");
              return;
            }
            const search_query = encodeURIComponent(keywords.join("+OR+"));
            try {
              const now = new Date().toISOString().split("T")[0];
              const one_week_ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
              const url = `https://export.arxiv.org/api/query?search_query=all:${search_query}&sortBy=submittedDate&sortOrder=descending&max_results=5&submittedDate:[${one_week_ago}+TO+${now}]`;
              const xml = await fetch(url).then(r => r.text());
              const doc = new DOMParser().parseFromString(xml, "application/xml");


              const entries = Array.from(doc.getElementsByTagName("entry")).map(e => {
                const publishedEl = e.getElementsByTagName("published")[0];
                return {
                  title: e.getElementsByTagName("title")[0].textContent.trim(),
                  link: e.getElementsByTagName("id")[0].textContent.trim(),
                  published: publishedEl ? publishedEl.textContent.split("T")[0] : ""
                };
              });
              displaySuggestions(entries);
            } catch (err) {
              console.error("Suggestion fetch failed", err);
            }
          });
        };
        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return this.formatRelatedWorkResponse(response);
        } catch (error) {
            console.error('Related work API error:', error);
            throw new Error(`Related work discovery failed: ${error.message}`);
        }
    }

    /**
     * Text-to-Speech API
     * Converts paper summaries to audio
     */
    async generateAudioSummary(text, options = {}) {
        const endpoint = `${this.baseUrl}/v1/text-to-speech`;
        
        const requestBody = {
            text: text,
            voice_options: {
                voice_id: 'neural_voice_1',
                speed: 1.0,
                pitch: 1.0,
                language: 'en-US',
                format: 'mp3',
                ...options
            }
        };

        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return response.audio_url; // URL to the generated audio file
        } catch (error) {
            console.error('Text-to-speech API error:', error);
            throw new Error(`Audio generation failed: ${error.message}`);
        }
    }

    /**
     * Paper Recommendation API
     * Recommends papers based on user's library and preferences
     */
    async getRecommendations(userLibrary, preferences = {}) {
        const endpoint = `${this.baseUrl}/v1/recommendations`;
        
        const requestBody = {
            user_library: userLibrary.map(paper => ({
                id: paper.id,
                title: paper.title,
                keywords: paper.keywords,
                abstract: paper.abstract
            })),
            preferences: {
                research_areas: [],
                preferred_venues: [],
                citation_threshold: 10,
                recency_weight: 0.3,
                similarity_weight: 0.7,
                ...preferences
            }
        };

        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return this.formatRecommendationsResponse(response);
        } catch (error) {
            console.error('Recommendations API error:', error);
            throw new Error(`Recommendation generation failed: ${error.message}`);
        }
    }

    /**
     * Citation Analysis API
     * Analyzes citation networks and impact metrics
     */
    async analyzeCitations(paperIds) {
        const endpoint = `${this.baseUrl}/v1/citations`;
        
        const requestBody = {
            paper_ids: paperIds,
            analysis_options: {
                include_references: true,
                include_citations: true,
                calculate_metrics: true,
                build_network: true
            }
        };

        try {
            const response = await this.makeRequest('POST', endpoint, requestBody);
            return this.formatCitationResponse(response);
        } catch (error) {
            console.error('Citation analysis API error:', error);
            throw new Error(`Citation analysis failed: ${error.message}`);
        }
    }

    /**
     * Make HTTP request with proper error handling
     */
    async makeRequest(method, url, body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Version': '1.0'
        };

        const config = {
            method: method,
            headers: headers,
            timeout: this.timeout
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Format analysis response
     */
    formatAnalysisResponse(response) {
        return {
            id: response.document_id || this.generateId(),
            title: response.extracted_metadata?.title || 'Untitled Document',
            authors: response.extracted_metadata?.authors || [],
            abstract: response.extracted_metadata?.abstract || '',
            keywords: response.extracted_keywords || [],
            summary: response.generated_summary || '',
            findings: response.key_findings || [],
            confidence_score: response.confidence_score || 0.8,
            metadata: {
                page_count: response.document_info?.page_count || 0,
                word_count: response.document_info?.word_count || 0,
                language: response.document_info?.language || 'en',
                document_type: response.document_info?.type || 'academic_paper',
                references: response.extracted_references || []
            },
            processing_info: {
                processed_date: new Date().toISOString(),
                processing_time: response.processing_time || 0,
                api_version: response.api_version || '1.0'
            }
        };
    }

    /**
     * Format clustering response
     */
    formatClusteringResponse(response) {
        return {
            clusters: response.clusters.map((cluster, index) => ({
                id: cluster.cluster_id || `cluster_${index + 1}`,
                name: cluster.cluster_name || `Cluster ${index + 1}`,
                description: cluster.description || 'Auto-generated cluster',
                color: this.generateClusterColor(index),
                papers: cluster.paper_ids || [],
                keywords: cluster.representative_keywords || [],
                similarity_score: cluster.cohesion_score || 0.8,
                size: cluster.size || 0,
                created_date: new Date().toISOString()
            })),
            algorithm_info: {
                algorithm: response.algorithm_used || 'hierarchical',
                parameters: response.parameters || {},
                execution_time: response.execution_time || 0
            },
            quality_metrics: {
                silhouette_score: response.silhouette_score || 0.7,
                inertia: response.inertia || null,
                num_clusters: response.clusters?.length || 0
            }
        };
    }

    /**
     * Format related work response
     */
    formatRelatedWorkResponse(response) {
        return response.papers.map(paper => ({
            id: paper.paper_id || this.generateId(),
            title: paper.title || 'Untitled',
            authors: paper.authors || [],
            venue: paper.venue || 'Unknown Venue',
            year: paper.year || new Date().getFullYear(),
            url: paper.url || '',
            abstract: paper.abstract || '',
            keywords: paper.keywords || [],
            relevance_score: paper.relevance_score || 0.8,
            citation_count: paper.citation_count || 0,
            published_date: paper.published_date || new Date().toISOString(),
            source: paper.source || 'unknown',
            doi: paper.doi || null
        }));
    }

    /**
     * Format recommendations response
     */
    formatRecommendationsResponse(response) {
        return {
            recommendations: response.recommendations.map(rec => ({
                paper: rec.paper,
                score: rec.recommendation_score,
                reasons: rec.recommendation_reasons || [],
                similar_papers: rec.similar_papers || []
            })),
            recommendation_info: {
                algorithm: response.algorithm || 'collaborative_filtering',
                total_candidates: response.total_candidates || 0,
                filtered_count: response.filtered_count || 0,
                generated_at: new Date().toISOString()
            }
        };
    }

    /**
     * Format citation analysis response
     */
    formatCitationResponse(response) {
        return {
            citation_network: response.citation_network || {},
            metrics: response.metrics || {},
            influential_papers: response.influential_papers || [],
            citation_trends: response.citation_trends || [],
            analysis_date: new Date().toISOString()
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Generate cluster color
     */
    generateClusterColor(index) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
        ];
        return colors[index % colors.length];
    }
}

class GcpLiteratureAPI extends LiteratureAPI {
    constructor(config = {}) {
        super(config);

        this.projectId = config.projectId;
        this.location = config.location || 'us';
        this.processorId = config.processorId;
        this.processorVersion = config.processorVersion;
        this.languageHint = config.languageHint || 'en';
        this.summaryLength = config.summaryLength || 'MEDIUM';
        this.vertexLocation = config.vertexLocation || this.location;
        this.embeddingModel = config.embeddingModel || 'textembedding-gecko@003';

        if (!this.projectId) {
            throw new Error('projectId is not set.');
        }

        if (!this.processorId) {
            throw new Error('processorId is not set.');
        }

        this.documentClient = new DocumentProcessorServiceClient(config.documentClientOptions || {});
        this.languageClient = new LanguageServiceClient(config.languageClientOptions || {});
        this.vertexAI = new VertexAI({
            project: this.projectId,
            location: this.vertexLocation,
            ...config.vertexClientOptions
        });
        this.vertexEmbeddingModel = this.vertexAI.getTextEmbeddingModel(this.embeddingModel);
    }

    async analyzeDocument(fileData, fileName, options = {}) {
        const startTime = Date.now();

        try {
            const processedDocument = await this.processDocumentAI(fileData, options.mimeType || 'application/pdf');
            const extractedText = processedDocument.text || '';
            const metadata = this.extractMetadata(processedDocument, {
                fileName,
                languageHint: options.language || this.languageHint
            });

            if (!extractedText) {
                throw new Error('Failed to extract text from Document AI.');
            }

            const [summary, keywords] = await Promise.all([
                this.generateSummary(extractedText, options.summaryOptions || {}),
                this.extractKeywords(extractedText, options.keywordOptions || {})
            ]);

            const embeddings = await this.generateEmbeddings(extractedText, options.embeddingOptions || {});

            const processingTime = (Date.now() - startTime) / 1000;

            return {
                title: metadata.title || fileName.replace(/\.pdf$/i, ''),
                authors: metadata.authors,
                abstract: metadata.abstract,
                keywords,
                summary,
                findings: metadata.findings,
                confidence_score: metadata.confidence,
                metadata: {
                    page_count: metadata.pageCount,
                    word_count: metadata.wordCount,
                    language: metadata.language,
                    document_type: metadata.documentType,
                    references: metadata.references
                },
                processing_info: {
                    processed_date: new Date().toISOString(),
                    processing_time: processingTime,
                    api_version: processedDocument.revisionReference?.latestProcessorVersion || 'documentai_v1'
                },
                embeddings
            };
        } catch (error) {
            console.error('GCP Document analysis error:', error);
            throw new Error(`GCP document analysis failed: ${error.message}`);
        }
    }

    async processDocumentAI(fileData, mimeType = 'application/pdf') {
        const nameParts = [
            'projects', this.projectId,
            'locations', this.location,
            'processors', this.processorId
        ];

        if (this.processorVersion) {
            nameParts.push('processorVersions', this.processorVersion);
        }

        const name = nameParts.join('/');

        const contentBuffer = Buffer.isBuffer(fileData)
            ? fileData
            : Buffer.from(fileData, this.isBase64(fileData) ? 'base64' : undefined);

        const request = {
            name,
            rawDocument: {
                content: contentBuffer,
                mimeType
            }
        };

        const [result] = await this.documentClient.processDocument(request);
        return result.document || result;
    }

    async generateSummary(text, summaryOptions = {}) {
        const request = {
            document: {
                content: text,
                type: 'PLAIN_TEXT'
            },
            encodingType: 'UTF8',
            summaryConfig: {
                context: summaryOptions.context || '',
                summaryLength: summaryOptions.summaryLength || this.summaryLength
            }
        };

        try {
            const [response] = await this.languageClient.summarizeText(request);
            const summaries = response?.summaryResults?.flatMap(result => result.summaries || []) || [];

            if (summaries.length === 0) {
                return '';
            }

            return summaries
                .map(item => item.text?.trim())
                .filter(Boolean)
                .join('\n');
        } catch (error) {
            console.warn('The Natural Language API summarizeText call failed.', error);
            return '';
        }
    }

    async extractKeywords(text, keywordOptions = {}) {
        const request = {
            document: {
                content: text,
                type: 'PLAIN_TEXT'
            },
            encodingType: 'UTF8'
        };

        try {
            const [response] = await this.languageClient.analyzeEntities(request);
            const threshold = keywordOptions.salienceThreshold ?? 0.01;

            return (response.entities || [])
                .filter(entity => (entity.salience ?? 0) >= threshold)
                .map(entity => entity.name)
                .filter((value, index, self) => value && self.indexOf(value) === index);
        } catch (error) {
            console.warn('The call to the Natural Language API analyzeEntities failed.', error);
            return [];
        }
    }

    async generateEmbeddings(text, embeddingOptions = {}) {
        const input = embeddingOptions.inputText || text;
        if (!input) {
            return [];
        }

        try {
            const embeddingResponse = await this.vertexEmbeddingModel.getEmbeddings([input]);
            const [first] = embeddingResponse || [];
            return first?.values || [];
        } catch (error) {
            console.warn('Vertex AI embedding generation failed.', error);
            return [];
        }
    }

    extractMetadata(document, options = {}) {
        const metadata = {
            title: '',
            authors: [],
            abstract: '',
            findings: [],
            confidence: document.confidence ?? 0,
            pageCount: Array.isArray(document.pages) ? document.pages.length : 0,
            wordCount: 0,
            language: options.languageHint || this.languageHint,
            documentType: document.documentType || 'academic_paper',
            references: []
        };

        const text = document.text || '';
        metadata.wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

        if (Array.isArray(document.entities)) {
            document.entities.forEach(entity => {
                const type = entity.type?.toLowerCase();
                const value = entity.mentionText || entity.normalizedValue?.text;
                if (!value) {
                    return;
                }

                switch (type) {
                case 'title':
                    metadata.title = metadata.title || value;
                    break;
                case 'author':
                case 'authors':
                    metadata.authors.push(value);
                    break;
                case 'abstract':
                    metadata.abstract = metadata.abstract || value;
                    break;
                case 'finding':
                case 'conclusion':
                    metadata.findings.push(value);
                    break;
                case 'reference':
                    metadata.references.push({
                        text: value,
                        confidence: entity.confidence
                    });
                    break;
                case 'language':
                    metadata.language = value;
                    break;
                case 'doc_type':
                    metadata.documentType = value;
                    break;
                default:
                    break;
                }
            });
        }

        metadata.authors = metadata.authors.length > 0 ? metadata.authors : (document.authors || []);

        if (!metadata.abstract && text) {
            metadata.abstract = text.split('\n').slice(0, 3).join('\n');
        }

        return metadata;
    }

    isBase64(value) {
        if (typeof value !== 'string') {
            return false;
        }

        const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
        return base64Regex.test(value.replace(/\s+/g, ''));
    }
}

/**
 * Mock API Implementation for Testing
 * Use this when AWS API is not available
 */
class MockLiteratureAPI extends LiteratureAPI {
    constructor(config = {}) {
        super(config);
        this.mockDelay = config.mockDelay || 1000; // Simulate API delay
    }

    async analyzeDocument(fileData, fileName) {
        await this.delay(this.mockDelay);
        
        return {
            id: this.generateId(),
            title: fileName.replace('.pdf', '').replace(/[_-]/g, ' '),
            authors: ['Mock Author A.', 'Test Researcher B.'],
            abstract: 'This is a mock abstract generated for testing purposes. The actual implementation would extract the real abstract from the PDF using advanced text processing techniques.',
            keywords: ['research', 'analysis', 'mock', 'testing', 'academic'],
            summary: 'Mock summary: This paper presents a comprehensive analysis of the topic using advanced methodologies and provides significant insights for future research.',
            findings: [
                'Key finding 1: Significant improvement in performance metrics',
                'Key finding 2: Novel approach shows promising results',
                'Key finding 3: Framework applicable to broader contexts'
            ],
            confidence_score: 0.85,
            metadata: {
                page_count: Math.floor(Math.random() * 20) + 5,
                word_count: Math.floor(Math.random() * 5000) + 3000,
                language: 'en',
                document_type: 'academic_paper',
                references: []
            },
            processing_info: {
                processed_date: new Date().toISOString(),
                processing_time: this.mockDelay / 1000,
                api_version: 'mock_1.0'
            }
        };
    }

    async performClustering(papers) {
        await this.delay(this.mockDelay);
        
        // Simple mock clustering based on keywords
        const clusters = new Map();
        
        papers.forEach(paper => {
            const mainKeyword = paper.keywords[0] || 'general';
            if (!clusters.has(mainKeyword)) {
                clusters.set(mainKeyword, []);
            }
            clusters.get(mainKeyword).push(paper.id);
        });

        const clusterArray = Array.from(clusters.entries()).map(([keyword, paperIds], index) => ({
            id: `cluster_${index + 1}`,
            name: this.capitalizeFirstLetter(keyword),
            description: `Papers related to ${keyword} research`,
            color: this.generateClusterColor(index),
            papers: paperIds,
            keywords: [keyword],
            similarity_score: 0.7 + Math.random() * 0.2,
            size: paperIds.length,
            created_date: new Date().toISOString()
        }));

        return {
            clusters: clusterArray,
            algorithm_info: {
                algorithm: 'mock_keyword_clustering',
                parameters: { similarity_threshold: 0.7 },
                execution_time: this.mockDelay / 1000
            },
            quality_metrics: {
                silhouette_score: 0.6 + Math.random() * 0.3,
                inertia: null,
                num_clusters: clusterArray.length
            }
        };
    }

    async fetchRelatedWork(interests) {
        await this.delay(this.mockDelay);
        
        const mockPapers = [
            {
                id: 'related_1',
                title: 'Attention Is All You Need',
                authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
                venue: 'NIPS 2017',
                year: 2017,
                url: 'https://arxiv.org/abs/1706.03762',
                abstract: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms...',
                keywords: ['attention', 'transformer', 'neural networks'],
                relevance_score: 0.95,
                citation_count: 50000,
                published_date: '2017-06-12T00:00:00Z',
                source: 'arxiv'
            },
            {
                id: 'related_2',
                title: 'BERT: Pre-training of Deep Bidirectional Transformers',
                authors: ['Devlin, J.', 'Chang, M.', 'Lee, K.'],
                venue: 'NAACL 2019',
                year: 2019,
                url: 'https://arxiv.org/abs/1810.04805',
                abstract: 'We introduce a new language representation model called BERT...',
                keywords: ['bert', 'pre-training', 'nlp'],
                relevance_score: 0.92,
                citation_count: 30000,
                published_date: '2018-10-11T00:00:00Z',
                source: 'arxiv'
            }
        ];

        return mockPapers;
    }

    async generateAudioSummary(text) {
        await this.delay(this.mockDelay);
        
        // Mock audio URL - in real implementation, this would be a URL to generated audio
        return `data:audio/mp3;base64,mock_audio_data_${Date.now()}`;
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export API classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LiteratureAPI, GcpLiteratureAPI, MockLiteratureAPI };
} else {
    window.LiteratureAPI = LiteratureAPI;
    window.GcpLiteratureAPI = GcpLiteratureAPI;
    window.MockLiteratureAPI = MockLiteratureAPI;
}
