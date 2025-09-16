/**
 * Literature Manager - Content Script
 * Handles page interactions and PDF detection
 */

class ContentScript {
    constructor() {
        this.isEnabled = true;
        this.detectedPapers = [];
        
        this.init();
    }

    /**
     * Initialize content script
     */
    init() {
        console.log('Literature Manager content script loaded');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Detect academic papers on the current page
        this.detectAcademicPapers();
        
        // Monitor for dynamic content changes
        this.setupDynamicContentMonitoring();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Will respond asynchronously
        });

        // Monitor PDF downloads
        this.monitorPDFDownloads();
    }

    /**
     * Handle messages from extension components
     */
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'DETECT_PAPERS':
                    const papers = await this.detectAcademicPapers();
                    sendResponse({ success: true, papers: papers });
                    break;

                case 'GET_PAGE_INFO':
                    const pageInfo = this.getPageInfo();
                    sendResponse({ success: true, data: pageInfo });
                    break;

                case 'EXTRACT_PAPER_METADATA':
                    const metadata = this.extractPaperMetadata();
                    sendResponse({ success: true, data: metadata });
                    break;

                case 'INJECT_HELPER_UI':
                    this.injectHelperUI();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Content script message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Detect academic papers on the current page
     */
    detectAcademicPapers() {
        console.log('Detecting academic papers on page...');
        
        const detectedPapers = [];
        const currentUrl = window.location.href;

        // Check if we're on a known academic site
        const academicSites = [
            'arxiv.org',
            'scholar.google.com',
            'ieee.org',
            'acm.org',
            'springer.com',
            'sciencedirect.com',
            'jstor.org',
            'pubmed.ncbi.nlm.nih.gov',
            'semanticscholar.org',
            'researchgate.net'
        ];

        const isAcademicSite = academicSites.some(site => currentUrl.includes(site));

        if (isAcademicSite) {
            // Site-specific paper detection
            if (currentUrl.includes('arxiv.org')) {
                detectedPapers.push(...this.detectArxivPapers());
            } else if (currentUrl.includes('scholar.google.com')) {
                detectedPapers.push(...this.detectGoogleScholarPapers());
            } else if (currentUrl.includes('ieee.org')) {
                detectedPapers.push(...this.detectIEEEPapers());
            } else {
                // Generic academic paper detection
                detectedPapers.push(...this.detectGenericAcademicPapers());
            }
        }

        // Always check for PDF links regardless of site
        detectedPapers.push(...this.detectPDFLinks());

        this.detectedPapers = detectedPapers;
        
        if (detectedPapers.length > 0) {
            console.log(`Detected ${detectedPapers.length} papers on page`);
            this.notifyPapersDetected(detectedPapers);
        }

        return detectedPapers;
    }

    /**
     * Detect papers on ArXiv
     */
    detectArxivPapers() {
        const papers = [];
        
        try {
            // ArXiv paper page
            if (window.location.pathname.includes('/abs/')) {
                const titleElement = document.querySelector('h1.title');
                const authorsElement = document.querySelector('.authors');
                const abstractElement = document.querySelector('.abstract');
                
                if (titleElement) {
                    papers.push({
                        title: titleElement.textContent.replace('Title:', '').trim(),
                        authors: authorsElement ? this.extractAuthors(authorsElement.textContent) : [],
                        abstract: abstractElement ? abstractElement.textContent.replace('Abstract:', '').trim() : '',
                        url: window.location.href,
                        pdfUrl: window.location.href.replace('/abs/', '/pdf/') + '.pdf',
                        source: 'arxiv',
                        detectedOn: new Date().toISOString()
                    });
                }
            }
            
            // ArXiv search results
            const searchResults = document.querySelectorAll('.arxiv-result');
            searchResults.forEach(result => {
                const titleLink = result.querySelector('.list-title a');
                const authors = result.querySelector('.list-authors');
                
                if (titleLink) {
                    papers.push({
                        title: titleLink.textContent.trim(),
                        authors: authors ? this.extractAuthors(authors.textContent) : [],
                        url: titleLink.href,
                        pdfUrl: titleLink.href.replace('/abs/', '/pdf/') + '.pdf',
                        source: 'arxiv',
                        detectedOn: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            console.error('Error detecting ArXiv papers:', error);
        }

        return papers;
    }

    /**
     * Detect papers on Google Scholar
     */
    detectGoogleScholarPapers() {
        const papers = [];
        
        try {
            const searchResults = document.querySelectorAll('[data-lid]');
            
            searchResults.forEach(result => {
                const titleElement = result.querySelector('h3 a');
                const authorsElement = result.querySelector('.gs_a');
                const snippetElement = result.querySelector('.gs_rs');
                
                if (titleElement) {
                    papers.push({
                        title: titleElement.textContent.trim(),
                        authors: authorsElement ? this.extractAuthors(authorsElement.textContent) : [],
                        abstract: snippetElement ? snippetElement.textContent.trim() : '',
                        url: titleElement.href,
                        source: 'google_scholar',
                        detectedOn: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            console.error('Error detecting Google Scholar papers:', error);
        }

        return papers;
    }

    /**
     * Detect papers on IEEE Xplore
     */
    detectIEEEPapers() {
        const papers = [];
        
        try {
            // IEEE paper page
            const titleElement = document.querySelector('.document-title');
            const authorsElement = document.querySelector('.authors-info');
            const abstractElement = document.querySelector('.abstract-text');
            
            if (titleElement) {
                papers.push({
                    title: titleElement.textContent.trim(),
                    authors: authorsElement ? this.extractAuthors(authorsElement.textContent) : [],
                    abstract: abstractElement ? abstractElement.textContent.trim() : '',
                    url: window.location.href,
                    source: 'ieee',
                    detectedOn: new Date().toISOString()
                });
            }
            
            // IEEE search results
            const searchResults = document.querySelectorAll('.List-results-items');
            searchResults.forEach(result => {
                const titleLink = result.querySelector('.result-item-title a');
                const authors = result.querySelector('.result-item-authors');
                
                if (titleLink) {
                    papers.push({
                        title: titleLink.textContent.trim(),
                        authors: authors ? this.extractAuthors(authors.textContent) : [],
                        url: titleLink.href,
                        source: 'ieee',
                        detectedOn: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            console.error('Error detecting IEEE papers:', error);
        }

        return papers;
    }

    /**
     * Generic academic paper detection
     */
    detectGenericAcademicPapers() {
        const papers = [];
        
        try {
            // Look for common academic paper patterns
            const potentialTitles = document.querySelectorAll('h1, h2, .title, .paper-title, .article-title');
            
            potentialTitles.forEach(titleElement => {
                const text = titleElement.textContent.trim();
                
                // Check if it looks like an academic paper title
                if (this.isAcademicTitle(text)) {
                    papers.push({
                        title: text,
                        authors: this.findNearbyAuthors(titleElement),
                        abstract: this.findNearbyAbstract(titleElement),
                        url: window.location.href,
                        source: 'generic',
                        detectedOn: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            console.error('Error detecting generic academic papers:', error);
        }

        return papers;
    }

    /**
     * Detect PDF links on the page
     */
    detectPDFLinks() {
        const papers = [];
        
        try {
            const pdfLinks = document.querySelectorAll('a[href*=".pdf"]');
            
            pdfLinks.forEach(link => {
                const linkText = link.textContent.trim();
                const href = link.href;
                
                // Skip if it's just "PDF" or similar generic text
                if (linkText.length > 10 && this.isAcademicTitle(linkText)) {
                    papers.push({
                        title: linkText,
                        authors: this.findNearbyAuthors(link),
                        url: window.location.href,
                        pdfUrl: href,
                        source: 'pdf_link',
                        detectedOn: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            console.error('Error detecting PDF links:', error);
        }

        return papers;
    }

    /**
     * Check if text looks like an academic paper title
     */
    isAcademicTitle(text) {
        if (!text || text.length < 10 || text.length > 200) return false;
        
        // Academic keywords that commonly appear in paper titles
        const academicKeywords = [
            'analysis', 'approach', 'algorithm', 'method', 'model', 'framework',
            'study', 'research', 'investigation', 'evaluation', 'assessment',
            'deep', 'learning', 'neural', 'network', 'machine', 'artificial',
            'intelligence', 'computer', 'vision', 'processing', 'recognition',
            'optimization', 'classification', 'prediction', 'detection',
            'system', 'application', 'performance', 'improvement', 'novel',
            'effective', 'efficient', 'robust', 'scalable', 'automatic'
        ];
        
        const lowerText = text.toLowerCase();
        const hasAcademicKeywords = academicKeywords.some(keyword => lowerText.includes(keyword));
        
        // Check for academic patterns
        const hasColonPattern = text.includes(':');
        const hasCapitalizedWords = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text);
        
        return hasAcademicKeywords || hasColonPattern || hasCapitalizedWords;
    }

    /**
     * Extract authors from text
     */
    extractAuthors(text) {
        if (!text) return [];
        
        // Common patterns for author names
        const authorPatterns = [
            /([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)/g, // "John A. Smith"
            /([A-Z][a-z]+,\s*[A-Z]\.)/g, // "Smith, J."
            /([A-Z]\.?\s*[A-Z][a-z]+)/g // "J. Smith"
        ];
        
        const authors = [];
        
        for (const pattern of authorPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                authors.push(...matches.map(author => author.trim()));
            }
        }
        
        // Remove duplicates and filter out common false positives
        const filteredAuthors = [...new Set(authors)].filter(author => {
            const lowerAuthor = author.toLowerCase();
            return !['published', 'journal', 'conference', 'proceedings', 'abstract'].includes(lowerAuthor);
        });
        
        return filteredAuthors.slice(0, 10); // Limit to 10 authors
    }

    /**
     * Find authors near a title element
     */
    findNearbyAuthors(titleElement) {
        const searchElements = [
            titleElement.nextElementSibling,
            titleElement.parentElement?.nextElementSibling,
            titleElement.parentElement?.querySelector('.authors'),
            titleElement.parentElement?.querySelector('.author'),
            titleElement.parentElement?.querySelector('[class*="author"]')
        ].filter(Boolean);
        
        for (const element of searchElements) {
            if (element) {
                const authors = this.extractAuthors(element.textContent);
                if (authors.length > 0) {
                    return authors;
                }
            }
        }
        
        return [];
    }

    /**
     * Find abstract near a title element
     */
    findNearbyAbstract(titleElement) {
        const searchElements = [
            titleElement.parentElement?.querySelector('.abstract'),
            titleElement.parentElement?.querySelector('[class*="abstract"]'),
            titleElement.parentElement?.querySelector('.summary'),
            titleElement.parentElement?.querySelector('[class*="summary"]')
        ].filter(Boolean);
        
        for (const element of searchElements) {
            if (element) {
                const text = element.textContent.trim();
                if (text.length > 50 && text.length < 2000) {
                    return text;
                }
            }
        }
        
        return '';
    }

    /**
     * Monitor PDF downloads
     */
    monitorPDFDownloads() {
        // Intercept PDF download links
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a');
            if (target && target.href && target.href.includes('.pdf')) {
                this.handlePDFDownload(target.href, target);
            }
        });
    }

    /**
     * Handle PDF download detection
     */
    async handlePDFDownload(pdfUrl, linkElement) {
        console.log('PDF download detected:', pdfUrl);
        
        try {
            // Extract metadata from the link context
            const metadata = {
                pdfUrl: pdfUrl,
                pageUrl: window.location.href,
                linkText: linkElement.textContent.trim(),
                title: this.extractTitleFromContext(linkElement),
                authors: this.findNearbyAuthors(linkElement),
                detectedOn: new Date().toISOString()
            };
            
            // Send to background script for processing
            chrome.runtime.sendMessage({
                type: 'PDF_DOWNLOAD_DETECTED',
                data: metadata
            }).catch(error => {
                console.error('Error sending PDF download notification:', error);
            });
            
        } catch (error) {
            console.error('Error handling PDF download:', error);
        }
    }

    /**
     * Extract title from link context
     */
    extractTitleFromContext(linkElement) {
        // Try to find title in various ways
        const titleSources = [
            linkElement.title,
            linkElement.textContent.trim(),
            linkElement.closest('article')?.querySelector('h1, h2, h3')?.textContent,
            linkElement.parentElement?.querySelector('.title')?.textContent,
            linkElement.parentElement?.textContent.trim()
        ].filter(Boolean);
        
        for (const title of titleSources) {
            if (title && title.length > 10 && this.isAcademicTitle(title)) {
                return title.trim();
            }
        }
        
        return linkElement.textContent.trim() || 'Unknown Title';
    }

    /**
     * Setup dynamic content monitoring
     */
    setupDynamicContentMonitoring() {
        // Monitor for new content being added to the page
        const observer = new MutationObserver((mutations) => {
            let shouldRedetect = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes contain potential papers
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasRelevantContent = node.querySelector &&
                                (node.querySelector('a[href*=".pdf"]') ||
                                 node.querySelector('.title') ||
                                 node.querySelector('[class*="paper"]') ||
                                 node.querySelector('[class*="article"]'));
                            
                            if (hasRelevantContent) {
                                shouldRedetect = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRedetect) {
                // Debounce the detection to avoid excessive calls
                clearTimeout(this.detectionTimeout);
                this.detectionTimeout = setTimeout(() => {
                    this.detectAcademicPapers();
                }, 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Inject helper UI for quick paper management
     */
    injectHelperUI() {
        if (document.getElementById('literature-manager-helper')) {
            return; // Already injected
        }
        
        const helper = document.createElement('div');
        helper.id = 'literature-manager-helper';
        helper.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; 
                        background: #667eea; color: white; padding: 10px; border-radius: 8px; 
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px; max-width: 300px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">📚 Literature Manager</span>
                    <button id="close-helper" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">&times;</button>
                </div>
                <div id="helper-content">
                    <div style="margin-bottom: 8px;">
                        Found <span id="papers-count">${this.detectedPapers.length}</span> paper(s) on this page
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="quick-save" style="background: rgba(255,255,255,0.2); border: none; color: white; 
                                padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Quick Save
                        </button>
                        <button id="view-papers" style="background: rgba(255,255,255,0.2); border: none; color: white; 
                                padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            View Papers
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(helper);
        
        // Setup helper UI event listeners
        document.getElementById('close-helper').addEventListener('click', () => {
            helper.remove();
        });
        
        document.getElementById('quick-save').addEventListener('click', () => {
            this.quickSavePapers();
        });
        
        document.getElementById('view-papers').addEventListener('click', () => {
            this.showDetectedPapers();
        });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (helper.parentElement) {
                helper.style.transition = 'opacity 0.5s ease';
                helper.style.opacity = '0.7';
            }
        }, 10000);
    }

    /**
     * Quick save detected papers
     */
    async quickSavePapers() {
        if (this.detectedPapers.length === 0) {
            this.showNotification('No papers detected on this page', 'warning');
            return;
        }
        
        try {
            // Send papers to background for processing
            chrome.runtime.sendMessage({
                type: 'QUICK_SAVE_PAPERS',
                data: this.detectedPapers
            });
            
            this.showNotification(`Saving ${this.detectedPapers.length} paper(s)...`, 'success');
            
        } catch (error) {
            console.error('Error quick saving papers:', error);
            this.showNotification('Error saving papers', 'error');
        }
    }

    /**
     * Show detected papers in a modal
     */
    showDetectedPapers() {
        if (this.detectedPapers.length === 0) {
            this.showNotification('No papers detected on this page', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'detected-papers-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
                        justify-content: center; align-items: center;">
                <div style="background: white; border-radius: 12px; padding: 20px; 
                            max-width: 600px; max-height: 80%; overflow-y: auto;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #333;">Detected Papers</h2>
                        <button id="close-modal" style="background: none; border: none; font-size: 24px; 
                                cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div id="papers-list">
                        ${this.detectedPapers.map((paper, index) => `
                            <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                                <div style="font-weight: 600; margin-bottom: 8px;">${paper.title}</div>
                                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                                    ${paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown authors'}
                                </div>
                                <div style="color: #999; font-size: 12px; margin-bottom: 8px;">
                                    Source: ${paper.source} • ${paper.pdfUrl ? 'PDF Available' : 'No PDF'}
                                </div>
                                <button onclick="window.literatureContentScript.saveSinglePaper(${index})"
                                        style="background: #667eea; color: white; border: none; padding: 6px 12px; 
                                               border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    Save This Paper
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <button onclick="window.literatureContentScript.saveAllPapers()"
                                style="background: #28a745; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px;">
                            Save All Papers
                        </button>
                        <button id="cancel-modal"
                                style="background: #6c757d; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup modal event listeners
        document.getElementById('close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('cancel-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Save a single paper
     */
    async saveSinglePaper(paperIndex) {
        if (paperIndex < 0 || paperIndex >= this.detectedPapers.length) return;
        
        const paper = this.detectedPapers[paperIndex];
        
        try {
            chrome.runtime.sendMessage({
                type: 'SAVE_DETECTED_PAPER',
                data: paper
            });
            
            this.showNotification(`Saving "${paper.title}"...`, 'success');
            
        } catch (error) {
            console.error('Error saving single paper:', error);
            this.showNotification('Error saving paper', 'error');
        }
    }

    /**
     * Save all detected papers
     */
    async saveAllPapers() {
        try {
            chrome.runtime.sendMessage({
                type: 'SAVE_ALL_DETECTED_PAPERS',
                data: this.detectedPapers
            });
            
            this.showNotification(`Saving ${this.detectedPapers.length} paper(s)...`, 'success');
            
            // Close modal
            const modal = document.getElementById('detected-papers-modal');
            if (modal) modal.remove();
            
        } catch (error) {
            console.error('Error saving all papers:', error);
            this.showNotification('Error saving papers', 'error');
        }
    }

    /**
     * Notify about detected papers
     */
    notifyPapersDetected(papers) {
        // Send notification to background script
        chrome.runtime.sendMessage({
            type: 'PAPERS_DETECTED',
            data: {
                count: papers.length,
                url: window.location.href,
                papers: papers
            }
        }).catch(error => {
            console.error('Error sending papers detected notification:', error);
        });
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10002;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get current page information
     */
    getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            papers_detected: this.detectedPapers.length,
            is_academic_site: this.isAcademicSite(),
            page_text_length: document.body.textContent.length,
            has_pdf_links: document.querySelectorAll('a[href*=".pdf"]').length > 0
        };
    }

    /**
     * Check if current site is academic
     */
    isAcademicSite() {
        const academicDomains = [
            'arxiv.org', 'scholar.google.com', 'ieee.org', 'acm.org',
            'springer.com', 'sciencedirect.com', 'jstor.org',
            'pubmed.ncbi.nlm.nih.gov', 'semanticscholar.org',
            'researchgate.net', 'academia.edu', 'mendeley.com'
        ];
        
        return academicDomains.some(domain => window.location.hostname.includes(domain));
    }

    /**
     * Extract paper metadata from current page
     */
    extractPaperMetadata() {
        const metadata = {
            url: window.location.href,
            title: document.title,
            extracted_on: new Date().toISOString()
        };
        
        // Try to extract structured metadata
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            
            if (name && content) {
                if (name.includes('title')) metadata.meta_title = content;
                if (name.includes('author')) metadata.meta_authors = content;
                if (name.includes('description')) metadata.meta_description = content;
                if (name.includes('keywords')) metadata.meta_keywords = content;
            }
        });
        
        // Extract JSON-LD structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@type'] === 'ScholarlyArticle' || data['@type'] === 'Article') {
                    metadata.structured_data = data;
                }
            } catch (error) {
                // Ignore invalid JSON
            }
        });
        
        return metadata;
    }
}

// Initialize content script and make it globally available
window.literatureContentScript = new ContentScript();