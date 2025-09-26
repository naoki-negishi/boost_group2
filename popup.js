/**
 * Literature Manager - Main popup controller
 * Handles UI interactions and coordinates with background services
 */

class LiteratureManager {
    constructor() {
        this.currentPapers = [];
        this.currentClusters = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.uploadListenersSetup = false; // Flag to prevent duplicate setup

        this.init();
    }

    /**
     * Initialize the extension
     */
    async init() {
        console.log('Initializing Literature Manager...');

        // Load existing data
        await this.loadData();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateStatusPanel();
        this.updateClustersPreview();

        console.log('Literature Manager initialized');
    }

    /**
     * Setup event listeners for all UI components
     */
    setupEventListeners() {
        // Main buttons
        document.getElementById('uploadBtn')?.addEventListener('click', () => this.showPopup('uploadPopup'));
        document.getElementById('clusterBtn')?.addEventListener('click', () => this.showPopup('clusterPopup'));
        document.getElementById('searchBtn')?.addEventListener('click', () => this.showPopup('searchPopup'));
        document.getElementById('relatedBtn')?.addEventListener('click', () => this.showPopup('relatedPopup'));
        document.getElementById('storageInfoBtn')?.addEventListener('click', () => this.showStorageInfo());

        // Setup close buttons for all popups
        this.setupGlobalCloseListeners();

        // Upload functionality
        this.setupUploadListeners();

        // Cluster functionality
        this.setupClusterListeners();

        // Search functionality
        this.setupSearchListeners();

        // Related work functionality
        this.setupRelatedWorkListeners();

        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === "ARXIV_XML") {
                console.log("popup.js recieved XML:", msg.xml);
                const doc = new DOMParser().parseFromString(xml, "application/xml");
            }
        });

    }

    /**
     * Setup global close button listeners for all popups
     */
    setupGlobalCloseListeners() {
        // Setup close buttons using data attributes
        document.querySelectorAll('.close-btn[data-close]').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const popupId = closeBtn.getAttribute('data-close');
                console.log('Close button clicked for:', popupId);
                this.closePopup(popupId);
            });
        });

        // Setup click-outside-to-close for all popup overlays
        document.querySelectorAll('.popup-overlay').forEach(popup => {
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    console.log('Clicked outside popup:', popup.id);
                    this.closePopup(popup.id);
                }
            });
        });

        // Setup ESC key to close popups
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openPopup = document.querySelector('.popup-overlay[style*="flex"]');
                if (openPopup) {
                    console.log('ESC pressed, closing popup:', openPopup.id);
                    this.closePopup(openPopup.id);
                }
            }
        });
    }

    /**
     * Setup upload-related event listeners
     */
    setupUploadListeners() {
        console.log('Setting up upload listeners...');

        // Use a flag to prevent duplicate listener setup
        if (this.uploadListenersSetup) {
            console.log('Upload listeners already setup, skipping...');
            return;
        }

        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const uploadArea = document.getElementById('uploadArea');
        const playAudioBtn = document.getElementById('playAudioBtn');

        console.log('Upload elements found:', {
            fileInput: !!fileInput,
            selectFilesBtn: !!selectFilesBtn,
            uploadArea: !!uploadArea,
            playAudioBtn: !!playAudioBtn
        });

        // File input change listener
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                console.log('File input changed, files:', e.target.files.length);
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files);
                }
            });
            console.log('File input listener added');
        }

        // Select Files button - single listener only
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Select Files button clicked');

                if (fileInput) {
                    fileInput.click();
                } else {
                    console.error('File input not found when button clicked');
                }
            });
            console.log('Select Files button listener added');
        }

        // Upload area for drag and drop only (not for clicking)
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                console.log('Files dropped:', e.dataTransfer.files.length);
                this.handleFileUpload(e.dataTransfer.files);
            });
            console.log('Drag and drop listeners added');
        }

        // Audio playback button
        if (playAudioBtn) {
            playAudioBtn.addEventListener('click', () => {
                console.log('Audio summary button clicked');
                this.playAudioSummary();
            });
            console.log('Audio button listener added');
        }

        // Mark as setup to prevent duplicate setup
        this.uploadListenersSetup = true;
        console.log('Upload listeners setup completed');
    }

    /**
     * Setup cluster-related event listeners
     */
    setupClusterListeners() {
        const reclusterBtn = document.getElementById('reclusterBtn');
        const exportClustersBtn = document.getElementById('exportClustersBtn');

        reclusterBtn.addEventListener('click', () => this.performClustering());
        exportClustersBtn.addEventListener('click', () => this.exportClusters());
    }

    /**
     * Setup search-related event listeners
     */
    setupSearchListeners() {
        const searchInput = document.getElementById('paperSearchInput');

        // Real-time search
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.performSearch();
        });

        // Initialize search when popup opens
        this.showPopup = ((original) => {
            return function(popupId) {
                original.call(this, popupId);
                if (popupId === 'searchPopup') {
                    this.initializeSearch();
                }
            };
        })(this.showPopup);
    }

    /**
     * Setup related work event listeners
     */
    setupRelatedWorkListeners() {
        const fetchRelatedBtn = document.getElementById('fetchRelatedBtn');
        const configureInterestsBtn = document.getElementById('configureInterestsBtn');

        fetchRelatedBtn.addEventListener('click', () => this.fetchRelatedWork());
        configureInterestsBtn.addEventListener('click', () => this.configureInterests());
    }

    /**
     * Handle file upload and processing
     */
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const analysisResult = document.getElementById('analysisResult');
        const analysisContent = document.getElementById('analysisContent');
        const playAudioBtn = document.getElementById('playAudioBtn');

        try {
            // Show progress bar
            progressBar.style.display = 'block';
            analysisResult.style.display = 'none';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Update progress
                const progress = ((i + 1) / files.length) * 100;
                progressFill.style.width = `${progress}%`;

                console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);

                // Read file as base64
                const fileData = await this.readFileAsBase64(file);

                // Send to AWS API for analysis
                const analysisResults = await this.analyzeDocument(fileData, file);

                // Store the processed paper
                await this.storePaper(analysisResults, file);

                // Update UI
                this.updateStatusPanel();
            }

            // Show results
            progressBar.style.display = 'none';
            analysisResult.style.display = 'block';

            analysisContent.innerHTML = `
                <p><strong>Successfully processed ${files.length} file(s)</strong></p>
                <p>Documents have been analyzed and added to your library.</p>
            `;

            // Enable audio summary button
            playAudioBtn.style.display = 'inline-block';

            // Perform clustering if we have enough papers
            if (this.currentPapers.length >= 2) {
                await this.performClustering();
            }

        } catch (error) {
            console.error('Error processing files:', error);
            progressBar.style.display = 'none';
            analysisResult.style.display = 'block';
            analysisContent.innerHTML = `
                <p style="color: red;"><strong>Error processing files</strong></p>
                <p>${error.message}</p>
            `;
        }
    }

    /**
     * Read file as base64 string
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Analyze document using AWS API
     */
    async analyzeDocument(fileData, file) {
        try {
            const payload = {
                fileData,
                fileName: file.name || 'document.pdf',
                fileType: file.type || 'application/pdf',
                fileSize: file.size || 0
            };

            const response = await chrome.runtime.sendMessage({
                type: 'ANALYZE_DOCUMENT',
                data: payload
            });

            if (!response?.success) {
                throw new Error(response?.error || 'Background analysis failed');
            }

            return response.data;
        } catch (error) {
            console.error('API Error:', error);
        }
    }

    /**
     * Store paper data locally
     */
    async storePaper(analysisResults, file) {
        const paperData = {
            ...analysisResults,
            local_file: file,
            file_size: file.size,
            file_type: file.type,
            processed_date: new Date().toISOString()
        };

        this.currentPapers.push(paperData);

        // Save to Chrome storage
        await chrome.storage.local.set({
            papers: this.currentPapers,
            lastUpdated: new Date().toISOString()
        });
    }

    /**
     * Perform clustering analysis
     */
    async performClustering() {
        if (this.currentPapers.length < 2) {
            console.log('Need at least 2 papers for clustering');
            return;
        }

        try {
            console.log('Performing clustering analysis...');

            const payload = {
                fileData,
            };
            this.currentClusters = await chrome.runtime.sendMessage({
                type: 'PERFORM_CLUSTERING',
                data: payload
            });

            // Save clusters
            await chrome.storage.local.set({
                clusters: this.currentClusters
            });

            // Update UI
            this.updateClustersPreview();
            this.displayClusters();

            console.log('Clustering completed');
        } catch (error) {
            console.error('Clustering error:', error);
        }
    }

    /**
     * Initialize search functionality
     */
    async initializeSearch() {
        this.updateSearchFilters();
        this.performSearch();
    }

    /**
     * Update search filter buttons based on available clusters
     */
    updateSearchFilters() {
        const filtersContainer = document.getElementById('searchFilters');

        // Clear existing filters except "All Papers"
        const allButton = filtersContainer.querySelector('[data-filter="all"]');
        filtersContainer.innerHTML = '';
        filtersContainer.appendChild(allButton);

        // Add cluster filters
        this.currentClusters.forEach(cluster => {
            const filterBtn = document.createElement('button');
            filterBtn.className = 'filter-btn';
            filterBtn.dataset.filter = cluster.id;
            filterBtn.textContent = cluster.name;
            filterBtn.addEventListener('click', () => this.setSearchFilter(cluster.id));
            filtersContainer.appendChild(filterBtn);
        });

        // Set up filter button clicks
        allButton.addEventListener('click', () => this.setSearchFilter('all'));
    }

    /**
     * Set active search filter
     */
    setSearchFilter(filter) {
        this.currentFilter = filter;

        // Update button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Perform search with new filter
        this.performSearch();
    }

    /**
     * Perform search based on current query and filter
     */
    performSearch() {
        const paperList = document.getElementById('paperList');
        let filteredPapers = [...this.currentPapers];

        // Apply cluster filter
        if (this.currentFilter !== 'all') {
            const selectedCluster = this.currentClusters.find(c => c.id === this.currentFilter);
            if (selectedCluster) {
                filteredPapers = selectedCluster.papers;
            }
        }

        // Apply search query
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filteredPapers = filteredPapers.filter(paper => {
                return paper.title.toLowerCase().includes(query) ||
                       paper.authors.some(author => author.toLowerCase().includes(query)) ||
                       paper.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
                       paper.abstract.toLowerCase().includes(query);
            });
        }

        // Display results
        this.displaySearchResults(filteredPapers, paperList);
    }

    /**
     * Display search results
     */
    displaySearchResults(papers, container) {
        if (papers.length === 0) {
            container.innerHTML = '<div class="no-results">No papers found matching your criteria</div>';
            return;
        }

        container.innerHTML = papers.map(paper => {
            const clusterName = this.getClusterForPaper(paper)?.name || 'Uncategorized';

            return `
                <div class="paper-card" data-paper-id="${paper.id}">
                    <div class="paper-title">${paper.title}</div>
                    <div class="paper-authors">${paper.authors.join(', ')}</div>
                    <div class="paper-cluster">${clusterName}</div>
                </div>
            `;
        }).join('');

        // Add click listeners to paper cards
        container.querySelectorAll('.paper-card').forEach(card => {
            card.addEventListener('click', () => {
                const paperId = card.getAttribute('data-paper-id');
                this.showPaperDetail(paperId);
            });
        });
    }

    /**
     * Get cluster for a specific paper
     */
    getClusterForPaper(paper) {
        return this.currentClusters.find(cluster => 
            cluster.papers.some(p => p.id === paper.id)
        );
    }

    /**
     * Show paper detail popup
     */
    showPaperDetail(paperId) {
        const paper = this.currentPapers.find(p => p.id === paperId);
        if (!paper) return;

        const cluster = this.getClusterForPaper(paper);
        const detailBody = document.getElementById('paperDetailBody');

        detailBody.innerHTML = `
            <div class="paper-meta">
                <div class="paper-meta-item">
                    <span class="paper-meta-label">Authors:</span>
                    <span class="paper-meta-value">${paper.authors.join(', ')}</span>
                </div>
                <div class="paper-meta-item">
                    <span class="paper-meta-label">Cluster:</span>
                    <span class="paper-meta-value">${cluster?.name || 'Uncategorized'}</span>
                </div>
                <div class="paper-meta-item">
                    <span class="paper-meta-label">Uploaded:</span>
                    <span class="paper-meta-value">${new Date(paper.processed_date).toLocaleDateString()}</span>
                </div>
                <div class="paper-meta-item">
                    <span class="paper-meta-label">File Size:</span>
                    <span class="paper-meta-value">${(paper.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            </div>

            <div class="paper-abstract">
                <h3>Abstract</h3>
                <div class="paper-abstract-text">${paper.abstract}</div>
            </div>

            <div class="paper-keywords">
                ${paper.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
            </div>

            ${paper.findings ? `
                <div class="paper-findings">
                    <h4>Key Findings</h4>
                    <ul>
                        ${paper.findings.map(finding => `<li>${finding}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="reading-info">
                <span>Confidence Score</span>
                <div class="quality-score">
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${(paper.confidence_score || 0.8) * 100}%"></div>
                    </div>
                    <span>${Math.round((paper.confidence_score || 0.8) * 100)}%</span>
                </div>
            </div>

            <div class="paper-actions">
                <button class="action-btn" data-action="read" data-paper-id="${paper.id}">
                    📖 Read Full Text
                </button>
                <button class="action-btn secondary" data-action="export" data-paper-id="${paper.id}">
                    📤 Export
                </button>
                <button class="action-btn secondary" data-action="delete" data-paper-id="${paper.id}">
                    🗑️ Delete
                </button>
            </div>
        `;

        // Add event listeners to action buttons
        detailBody.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                const paperId = btn.getAttribute('data-paper-id');

                switch(action) {
                    case 'read':
                        this.openPaperFile(paperId);
                        break;
                    case 'export':
                        this.exportPaper(paperId);
                        break;
                    case 'delete':
                        this.deletePaper(paperId);
                        break;
                }
            });
        });

        this.showPopup('paperDetailPopup');
    }

    /**
     * Open paper file (placeholder for actual implementation)
     */
    openPaperFile(paperId) {
        const paper = this.currentPapers.find(p => p.id === paperId);
        if (!paper) return;

        // TODO: Implement PDF viewer or open local file
        console.log('Opening paper:', paper.title);
        alert(`Opening "${paper.title}"\n\nThis would open the PDF file in a viewer.`);
    }

    /**
     * Export paper data
     */
    exportPaper(paperId) {
        const paper = this.currentPapers.find(p => p.id === paperId);
        if (!paper) return;

        const exportData = {
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            keywords: paper.keywords,
            summary: paper.summary,
            findings: paper.findings
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${paper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Delete paper
     */
    async deletePaper(paperId) {
        if (!confirm('Are you sure you want to delete this paper?')) return;

        this.currentPapers = this.currentPapers.filter(p => p.id !== paperId);

        // Update clusters
        this.currentClusters.forEach(cluster => {
            cluster.papers = cluster.papers.filter(p => p.id !== paperId);
        });

        // Remove empty clusters
        this.currentClusters = this.currentClusters.filter(cluster => cluster.papers.length > 0);

        // Save changes
        await chrome.storage.local.set({
            papers: this.currentPapers,
            clusters: this.currentClusters
        });

        // Update UI
        this.updateStatusPanel();
        this.updateClustersPreview();
        this.closePopup('paperDetailPopup');

        // Refresh search if search popup is open
        if (document.getElementById('searchPopup').style.display !== 'none') {
            this.performSearch();
        }
    }

    /**
     * Fetch related work from external sources
     */
    async fetchRelatedWork() {
        const relatedList = document.getElementById('relatedList');
        relatedList.innerHTML = '<div style="text-align: center; color: #666;">Fetching related papers...</div>';

        try {
            const data = await new Promise(resolve => chrome.storage.local.get(["papers"], resolve));
            // const titles = (data.papers || []).map(p => p.title);
            const keywords = (data.papers || []).filter(p => Array.isArray(p.keywords) && p.keywords.length > 0).flatMap(p => p.keywords);
            const response = await chrome.runtime.sendMessage({
                type: 'FETCH_RELATED_WORK',
                data: keywords  // list[string]
            });

            if (!response?.success) {
                throw new Error(response?.error || 'Background analysis failed');
            }

            const relatedPapers = response.data || [];
            relatedList.innerHTML = relatedPapers.map(paper => `
                <a href="${paper.url}" target="_blank" class="related-item">
                  <div class="related-title">${paper.title}</div>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    ${paper.authors.join(', ')} • ${paper.venue}
                  </div>
                </a>
            `).join('');
        } catch (error) {
            console.error('Error fetching related work:', error);
            relatedList.innerHTML = '<div style="text-align: center; color: red;">Error fetching related papers</div>';
        }
    }

    /**
     * Configure research interests
     */
    configureInterests() {
        // TODO: Implement interests configuration dialog
        alert('Configure Research Interests\n\nThis would open a dialog to set your research interests for better related work recommendations.');
    }

    /**
     * Play audio summary of recent papers
     */
    async playAudioSummary() {
        try {
            // TODO: Implement text-to-speech functionality
            // This could use Web Speech API or send to AWS Polly

            const summary = this.generateAudioSummary();

            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(summary);
                utterance.rate = 0.8;
                utterance.pitch = 1.0;
                speechSynthesis.speak(utterance);
            } else {
                alert('Audio Summary:\n\n' + summary);
            }
        } catch (error) {
            console.error('Error playing audio summary:', error);
        }
    }

    /**
     * Generate audio summary text
     */
    generateAudioSummary() {
        const recentPapers = this.currentPapers.slice(-3); // Last 3 papers

        let summary = `Summary of ${recentPapers.length} recently added papers: `;

        recentPapers.forEach((paper, index) => {
            summary += `Paper ${index + 1}: ${paper.title}. ${paper.summary || 'Key findings include ' + (paper.findings || []).join(', ')}. `;
        });

        return summary;
    }

    /**
     * Display clusters in cluster popup
     */
    displayClusters() {
        const clusterGrid = document.getElementById('clusterGrid');

        clusterGrid.innerHTML = this.currentClusters.map(cluster => `
            <div class="cluster-card" data-cluster-id="${cluster.id}">
                <div class="cluster-color" style="background-color: ${cluster.color}"></div>
                <h3>${cluster.name}</h3>
                <p style="font-size: 12px; color: #666; margin: 5px 0;">${cluster.description}</p>
                <p style="font-weight: 600;">${cluster.papers.length} papers</p>
            </div>
        `).join('');

        // Add click listeners to cluster cards
        clusterGrid.querySelectorAll('.cluster-card').forEach(card => {
            card.addEventListener('click', () => {
                const clusterId = card.getAttribute('data-cluster-id');
                this.showClusterDetail(clusterId);
            });
        });
    }

    /**
     * Show cluster detail
     */
    showClusterDetail(clusterId) {
        const cluster = this.currentClusters.find(c => c.id === clusterId);
        if (!cluster) return;

        // Switch to search popup and filter by this cluster
        this.closePopup('clusterPopup');
        this.showPopup('searchPopup');
        this.setSearchFilter(clusterId);
    }

    /**
     * Export clusters data
     */
    exportClusters() {
        const exportData = {
            clusters: this.currentClusters,
            generated_date: new Date().toISOString(),
            total_papers: this.currentPapers.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'literature_clusters.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Update status panel with current data
     */
    updateStatusPanel() {
        document.getElementById('totalPapers').textContent = this.currentPapers.length;
        document.getElementById('totalClusters').textContent = this.currentClusters.length;

        const lastUpdated = this.currentPapers.length > 0 
            ? new Date(Math.max(...this.currentPapers.map(p => new Date(p.processed_date)))).toLocaleDateString()
            : '--';
        document.getElementById('lastUpdated').textContent = lastUpdated;
    }

    /**
     * Update clusters preview in main popup
     */
    updateClustersPreview() {
        const clustersPreview = document.getElementById('clustersPreview');
        const clustersList = document.getElementById('clustersList');

        if (this.currentClusters.length === 0) {
            clustersPreview.style.display = 'none';
            return;
        }

        clustersPreview.style.display = 'block';

        clustersList.innerHTML = this.currentClusters.map(cluster => `
            <div class="cluster-tag" data-cluster-id="${cluster.id}">
                <div class="cluster-dot" style="background-color: ${cluster.color}"></div>
                <span class="cluster-name">${cluster.name}</span>
                <span class="cluster-count">${cluster.papers.length}</span>
            </div>
        `).join('');

        // Add click listeners to cluster tags
        clustersList.querySelectorAll('.cluster-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const clusterId = tag.getAttribute('data-cluster-id');
                this.showClusterDetail(clusterId);
            });
        });
    }

    /**
     * Load existing data from Chrome storage
     */
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['papers', 'clusters']);
            this.currentPapers = result.papers || [];
            this.currentClusters = result.clusters || [];

            console.log(`Loaded ${this.currentPapers.length} papers and ${this.currentClusters.length} clusters`);
        } catch (error) {
            console.error('Error loading data:', error);
            this.currentPapers = [];
            this.currentClusters = [];
        }
    }

    /**
     * Show storage information
     */
    async showStorageInfo() {
        try {
            const result = await chrome.storage.local.get(null);
            const dataSize = JSON.stringify(result).length;

            const lines = [
              "Storage Information:",
              `Papers: ${this.currentPapers.length}`,
              `Clusters: ${this.currentClusters.length}`,
              `Storage Used: ${(dataSize / 1024).toFixed(2)} KB`,
              "",
              `Last Updated: ${
                result.lastUpdated
                  ? new Date(result.lastUpdated).toLocaleString()
                  : "Never"
              }`
            ];
            alert(lines.join("\n"));
        } catch (error) {
            console.error('Error getting storage info:', error);
        }
    }

    /**
     * Show popup by ID
     */
    showPopup(popupId) {
        console.log('Showing popup:', popupId);

        // Hide all popups first
        document.querySelectorAll('.popup-overlay').forEach(popup => {
            popup.style.display = 'none';
        });

        // Show the requested popup
        const targetPopup = document.getElementById(popupId);
        if (targetPopup) {
            targetPopup.style.display = 'flex';
            console.log('Popup shown successfully:', popupId);

            // Initialize popup-specific functionality
            if (popupId === 'searchPopup') {
                this.initializeSearch();
            }
        } else {
            console.error('Popup not found:', popupId);
        }
    }

    /**
     * Close popup by ID
     */
    closePopup(popupId) {
        console.log('Closing popup:', popupId);
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.style.display = 'none';
            console.log('Popup closed successfully:', popupId);
        } else {
            console.error('Cannot close popup, not found:', popupId);
        }
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.literatureManager = new LiteratureManager();
});
