/**
 * Literature Manager - Background Service Worker
 * Handles background tasks, API communications, and data management
 */

class BackgroundService {
    constructor() {
        this.apiBaseUrl = 'https://your-aws-api.com'; // TODO: Replace with actual API URL
        this.isProcessing = false;
        this.apiInterface = null;

        this.init();
    }

    /**
     * Initialize background service
     */
    init() {
        console.log('Literature Manager Background Service started');

        // Setup event listeners
        this.setupEventListeners();

        // Setup periodic tasks (check if alarms API is available)
        if (chrome.alarms) {
            this.setupPeriodicTasks();
        } else {
            console.warn('Chrome alarms API not available');
        }
    }

    /**
     * Setup event listeners for extension lifecycle
     */
    setupEventListeners() {
        // Extension installation/update
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Message handling from popup and content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Will respond asynchronously
        });

        // Storage change monitoring
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                this.handleStorageChange(changes, namespace);
            });
        }
    }

    /**
     * Handle extension installation and updates
     */
    async handleInstallation(details) {
        console.log('Extension installed/updated:', details.reason);

        if (details.reason === 'install') {
            // First time installation
            await this.initializeStorage();
            console.log('Extension installed and initialized');
        } else if (details.reason === 'update') {
            // Extension updated
            await this.migrateData(details.previousVersion);
            console.log('Extension updated from version:', details.previousVersion);
        }
    }

    /**
     * Initialize storage with default values
     */
    async initializeStorage() {
        const defaultData = {
            papers: [],
            clusters: [],
            settings: {
                autoCluster: true,
                clusterThreshold: 0.7,
                apiEndpoint: this.apiBaseUrl,
                audioSummary: true,
                relatedWorkFrequency: 'daily'
            },
            userPreferences: {
                researchInterests: [],
                preferredVenues: [],
                language: 'en'
            },
            lastUpdated: new Date().toISOString(),
            version: '1.0.0'
        };

        await chrome.storage.local.set(defaultData);
        console.log('Storage initialized with default data');
    }

    /**
     * Migrate data from previous versions
     */
    async migrateData(previousVersion) {
        try {
            const currentData = await chrome.storage.local.get(null);

            // Add any new fields that might be missing
            const updates = {};

            if (!currentData.settings) {
                updates.settings = {
                    autoCluster: true,
                    clusterThreshold: 0.7,
                    apiEndpoint: this.apiBaseUrl,
                    audioSummary: true,
                    relatedWorkFrequency: 'daily'
                };
            }

            if (!currentData.userPreferences) {
                updates.userPreferences = {
                    researchInterests: [],
                    preferredVenues: [],
                    language: 'en'
                };
            }

            if (Object.keys(updates).length > 0) {
                await chrome.storage.local.set(updates);
                console.log('Data migrated successfully');
            }

        } catch (error) {
            console.error('Error migrating data:', error);
        }
    }

    /**
     * Handle messages from popup and content scripts
     */
    async handleMessage(message, sender, sendResponse) {
        console.log('Received message:', message.type);

        try {
            switch (message.type) {
                case 'ANALYZE_DOCUMENT':{
                    const analysisResult = await this.analyzeDocument(message.data);
                    sendResponse({ success: true, data: analysisResult });
                    break;
                }
                case 'PERFORM_CLUSTERING':
                    const clusterResult = await this.performClustering(message.data);
                    sendResponse({ success: true, data: clusterResult });
                    break;

                case 'FETCH_RELATED_WORK':
                    const relatedWork = await this.fetchRelatedWork(message.data);
                    sendResponse({ success: true, data: relatedWork });
                    break;

                case 'GENERATE_SUMMARY':
                    const summary = await this.generateSummary(message.data);
                    sendResponse({ success: true, data: summary });
                    break;

                case 'EXPORT_DATA':
                    const exportResult = await this.exportData(message.data);
                    sendResponse({ success: true, data: exportResult });
                    break;

                case 'SYNC_DATA':
                    const syncResult = await this.syncData();
                    sendResponse({ success: true, data: syncResult });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle storage changes
     */
    handleStorageChange(changes, namespace) {
        if (namespace === 'local') {
            console.log('Storage changed:', Object.keys(changes));

            // Notify any listening components about data changes
            chrome.runtime.sendMessage({
                type: 'STORAGE_UPDATED',
                changes: changes
            }).catch(() => {
                // Ignore errors if no listeners
            });
        }
    }

    /**
     * Get API authentication token
     */
    async getApiAuthToken() {
        // TODO: Implement proper authentication
        // This could involve OAuth, API keys, or other auth methods
        return 'Bearer YOUR_API_TOKEN';
    }

    /**
     * Analyze document using AWS API
     */
    async analyzeDocument(documentData) {
        if (this.isProcessing) {
            throw new Error('Another document is currently being processed');
        }
        this.isProcessing = true;

        try {
            console.log('Starting document analysis...');

            const apiResult = await sendPdfToPython(
                documentData.fileData,
                documentData.fileName,
            );

            console.log('Document analysis completed');
            return {
                id: this.generateUniqueId(),
                ...apiResult,
                file_info: {
                    original_name: documentData.fileName,
                    size: documentData.fileSize,
                    type: documentData.fileType
                }
            };
        } catch (error) {
            console.error('Document analysis error:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async function sendPdfToPython(fileData, fileName) {
        const response = await fetch("http://127.0.0.1:5000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: {
                filename: fileName,
                data: fileData
            }
        });

        const result = await response.json();
        console.log("API result:", result);
    }

    /**
     * Perform clustering analysis
     */
    async performClustering(papers) {
        console.log('Starting clustering analysis...');

        try {
            // Call clustering API
            const response = await fetch(`${this.apiBaseUrl}/cluster`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': await this.getApiAuthToken()
                },
                body: JSON.stringify({
                    papers: papers.map(paper => ({
                        id: paper.id,
                        title: paper.title,
                        abstract: paper.abstract,
                        keywords: paper.keywords,
                        summary: paper.summary
                    })),
                    clustering_options: {
                        algorithm: 'hierarchical',
                        similarity_threshold: 0.7,
                        max_clusters: 10,
                        min_cluster_size: 2
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Clustering API request failed: ${response.status}`);
            }

            const result = await response.json();
            return this.processClusteringResult(result, papers);

        } catch (error) {
            console.error('Clustering API error:', error);

            // Fallback to simple local clustering
            return this.performLocalClustering(papers);
        }
    }

    /**
     * Process clustering result from API
     */
    processClusteringResult(apiResult, papers) {
        const clusters = apiResult.clusters.map((cluster, index) => ({
            id: `cluster_${index + 1}`,
            name: cluster.name || `Cluster ${index + 1}`,
            description: cluster.description || 'Auto-generated cluster',
            color: this.generateClusterColor(index),
            papers: cluster.paper_ids.map(id => papers.find(p => p.id === id)).filter(Boolean),
            keywords: cluster.representative_keywords || [],
            similarity_score: cluster.cohesion_score || 0.8,
            created_date: new Date().toISOString()
        }));

        return {
            clusters: clusters,
            algorithm_info: {
                algorithm: apiResult.algorithm_used,
                parameters: apiResult.parameters,
                execution_time: apiResult.execution_time
            },
            quality_metrics: {
                silhouette_score: apiResult.silhouette_score,
                inertia: apiResult.inertia,
                num_clusters: clusters.length
            }
        };
    }

    /**
     * Perform simple local clustering as fallback
     */
    performLocalClustering(papers) {
        console.log('Performing local clustering fallback...');

        // Simple keyword-based clustering
        const keywordGroups = {};

        papers.forEach(paper => {
            const mainKeyword = paper.keywords[0] || 'general';
            if (!keywordGroups[mainKeyword]) {
                keywordGroups[mainKeyword] = [];
            }
            keywordGroups[mainKeyword].push(paper);
        });

        const clusters = Object.entries(keywordGroups)
            .filter(([_, clusterPapers]) => clusterPapers.length >= 1)
            .map(([keyword, clusterPapers], index) => ({
                id: `cluster_${index + 1}`,
                name: this.capitalizeFirstLetter(keyword),
                description: `Papers related to ${keyword}`,
                color: this.generateClusterColor(index),
                papers: clusterPapers,
                keywords: [keyword, ...new Set(clusterPapers.flatMap(p => p.keywords).slice(0, 5))],
                similarity_score: 0.7,
                created_date: new Date().toISOString()
            }));

        return {
            clusters: clusters,
            algorithm_info: {
                algorithm: 'keyword_based_local',
                parameters: { min_cluster_size: 1 },
                execution_time: 0.1
            },
            quality_metrics: {
                silhouette_score: 0.6,
                inertia: null,
                num_clusters: clusters.length
            }
        };
    }

    /**
     * Fetch related work from external sources
     */
    async fetchRelatedWork(userInterests) {
        console.log('Fetching related work...');

        try {
            // Call related work API
            const response = await fetch(`${this.apiBaseUrl}/related-work`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': await this.getApiAuthToken()
                },
                body: JSON.stringify({
                    interests: userInterests,
                    limit: 10,
                    time_range: '30d',
                    venues: ['arxiv', 'acl', 'nips', 'icml', 'iclr']
                })
            });

            if (!response.ok) {
                throw new Error(`Related work API request failed: ${response.status}`);
            }

            const result = await response.json();
            return result.papers;

        } catch (error) {
            console.error('Related work API error:', error);

            // Fallback to mock data
            return this.generateMockRelatedWork();
        }
    }

    /**
     * Generate mock related work for testing
     */
    generateMockRelatedWork() {
        return [
            {
                id: 'related_1',
                title: 'Attention Is All You Need',
                authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
                venue: 'NIPS 2017',
                url: 'https://arxiv.org/abs/1706.03762',
                abstract: 'We propose a new simple network architecture, the Transformer...',
                keywords: ['attention', 'transformer', 'neural networks'],
                relevance_score: 0.95,
                published_date: '2017-06-12',
                citation_count: 50000
            },
            {
                id: 'related_2',
                title: 'BERT: Pre-training of Deep Bidirectional Transformers',
                authors: ['Devlin, J.', 'Chang, M.', 'Lee, K.'],
                venue: 'NAACL 2019',
                url: 'https://arxiv.org/abs/1810.04805',
                abstract: 'We introduce a new language representation model called BERT...',
                keywords: ['bert', 'pre-training', 'nlp'],
                relevance_score: 0.92,
                published_date: '2018-10-11',
                citation_count: 30000
            }
        ];
    }

    /**
     * Generate summary for papers
     */
    async generateSummary(papers) {
        console.log('Generating summary...');

        try {
            // Call summary generation API
            const response = await fetch(`${this.apiBaseUrl}/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': await this.getApiAuthToken()
                },
                body: JSON.stringify({
                    papers: papers,
                    summary_type: 'comprehensive',
                    max_length: 500
                })
            });

            if (!response.ok) {
                throw new Error(`Summary API request failed: ${response.status}`);
            }

            const result = await response.json();
            return result.summary;

        } catch (error) {
            console.error('Summary generation error:', error);

            // Fallback to simple summary
            return this.generateLocalSummary(papers);
        }
    }

    /**
     * Generate local summary as fallback
     */
    generateLocalSummary(papers) {
        if (papers.length === 0) return 'No papers to summarize.';

        const totalPapers = papers.length;
        const recentPaper = papers[papers.length - 1];
        const allKeywords = [...new Set(papers.flatMap(p => p.keywords))];

        return `You have ${totalPapers} papers in your library. The most recent addition is "${recentPaper.title}". Key research areas include: ${allKeywords.slice(0, 5).join(', ')}. Your collection covers diverse topics in ${allKeywords.length} different keyword areas.`;
    }

    /**
     * Export data in various formats
     */
    async exportData(exportOptions) {
        console.log('Exporting data...');

        try {
            const data = await chrome.storage.local.get(['papers', 'clusters']);

            const exportData = {
                metadata: {
                    export_date: new Date().toISOString(),
                    version: '1.0.0',
                    total_papers: data.papers?.length || 0,
                    total_clusters: data.clusters?.length || 0
                },
                papers: data.papers || [],
                clusters: data.clusters || []
            };

            switch (exportOptions.format) {
                case 'json':
                    return {
                        data: JSON.stringify(exportData, null, 2),
                        filename: `literature_export_${new Date().toISOString().split('T')[0]}.json`,
                        contentType: 'application/json'
                    };

                case 'csv':
                    return {
                        data: this.convertToCSV(data.papers),
                        filename: `papers_export_${new Date().toISOString().split('T')[0]}.csv`,
                        contentType: 'text/csv'
                    };

                case 'bibtex':
                    return {
                        data: this.convertToBibTeX(data.papers),
                        filename: `bibliography_${new Date().toISOString().split('T')[0]}.bib`,
                        contentType: 'text/plain'
                    };

                default:
                    throw new Error('Unsupported export format');
            }

        } catch (error) {
            console.error('Export error:', error);
            throw error;
        }
    }

    /**
     * Convert papers data to CSV format
     */
    convertToCSV(papers) {
        if (!papers || papers.length === 0) return '';

        const headers = ['Title', 'Authors', 'Keywords', 'Upload Date', 'Confidence Score'];
        const rows = papers.map(paper => [
            `"${(paper.title || '').replace(/"/g, '""')}"`,
            `"${(paper.authors || []).join('; ')}"`,
            `"${(paper.keywords || []).join('; ')}"`,
            paper.processed_date || '',
            paper.confidence_score || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Convert papers data to BibTeX format
     */
    convertToBibTeX(papers) {
        if (!papers || papers.length === 0) return '';

        return papers.map(paper => {
          const title    = paper.title || "Untitled";
          const authors  = (paper.authors || []).join(" and ") || "Unknown";
          const year     = new Date(paper.processed_date || Date.now()).getFullYear();
          const keywords = (paper.keywords || []).join(", ");
          const key      = (title || "untitled").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);

          const fields = [
            `  title={${title}}`,
            `  author={${authors}}`,
            `  year={${year}}`,
            keywords ? `  keywords={${keywords}}` : null,
            `  note={Imported from Literature Manager}`
          ].filter(Boolean);

          return `@article{${key}${year},\n${fields.join(",\n")}\n}`;
        }).join("\n\n");
    }

    /**
     * Sync data with external services
     */
    async syncData() {
        console.log('Syncing data...');

        try {
            // TODO: Implement data synchronization with cloud services
            // This could sync with Google Drive, Dropbox, or custom backend

            return {
                success: true,
                message: 'Data synchronization not yet implemented',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        }
    }

    /**
     * Setup periodic background tasks
     */
    setupPeriodicTasks() {
        try {
            // Check for related work daily
            chrome.alarms.create('fetchRelatedWork', {
                delayInMinutes: 1, // Start after 1 minute
                periodInMinutes: 60 * 24 // Repeat daily
            });

            // Cleanup old data weekly
            chrome.alarms.create('cleanupData', {
                delayInMinutes: 60, // Start after 1 hour
                periodInMinutes: 60 * 24 * 7 // Repeat weekly
            });

            // Handle alarm events
            chrome.alarms.onAlarm.addListener((alarm) => {
                this.handlePeriodicTask(alarm.name);
            });

            console.log('Periodic tasks setup completed');
        } catch (error) {
            console.error('Error setting up periodic tasks:', error);
        }
    }

    /**
     * Handle periodic background tasks
     */
    async handlePeriodicTask(taskName) {
        console.log('Running periodic task:', taskName);

        try {
            switch (taskName) {
                case 'fetchRelatedWork':
                    await this.periodicRelatedWorkFetch();
                    break;

                case 'cleanupData':
                    await this.cleanupOldData();
                    break;

                default:
                    console.log('Unknown periodic task:', taskName);
            }
        } catch (error) {
            console.error('Periodic task error:', error);
        }
    }

    /**
     * Periodic related work fetching
     */
    async periodicRelatedWorkFetch() {
        try {
            const { userPreferences } = await chrome.storage.local.get(['userPreferences']);

            if (userPreferences && userPreferences.researchInterests.length > 0) {
                const relatedWork = await this.fetchRelatedWork(userPreferences.researchInterests);

                // Store related work with timestamp
                await chrome.storage.local.set({
                    recentRelatedWork: {
                        papers: relatedWork,
                        fetched_date: new Date().toISOString()
                    }
                });

                console.log('Related work updated automatically');
            }
        } catch (error) {
            console.error('Periodic related work fetch error:', error);
        }
    }

    /**
     * Cleanup old data to manage storage space
     */
    async cleanupOldData() {
        try {
            const data = await chrome.storage.local.get(null);
            let cleaned = false;

            // Remove old related work data (older than 7 days)
            if (data.recentRelatedWork) {
                const fetchedDate = new Date(data.recentRelatedWork.fetched_date);
                const daysSinceUpdate = (Date.now() - fetchedDate.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSinceUpdate > 7) {
                    await chrome.storage.local.remove(['recentRelatedWork']);
                    cleaned = true;
                }
            }

            // Archive very old papers (older than 1 year) to reduce active dataset
            if (data.papers && data.papers.length > 100) {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                const recentPapers = data.papers.filter(paper => {
                    const paperDate = new Date(paper.processed_date);
                    return paperDate > oneYearAgo;
                });

                if (recentPapers.length !== data.papers.length) {
                    await chrome.storage.local.set({ papers: recentPapers });
                    cleaned = true;
                }
            }

            if (cleaned) {
                console.log('Old data cleanup completed');
            }

        } catch (error) {
            console.error('Data cleanup error:', error);
        }
    }

    /**
     * Utility functions
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateClusterColor(index) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
        ];
        return colors[index % colors.length];
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize background service
const backgroundService = new BackgroundService();
