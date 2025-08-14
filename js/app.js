// Main Application Module

import { Utils } from './utils.js';
import { DataManager } from './dataManager.js';
import { UIRenderer } from './uiRenderer.js';

class UdonSharpExplorer {
    constructor() {
        this.dataManager = new DataManager();
        this.uiRenderer = new UIRenderer(this.dataManager);
        this.searchTimeout = null;
    }

    // Initialize application
    async initialize() {
        try {
            // Initialize data
            this.dataManager.initialize();
            
            // Set export date
            document.getElementById('exportDate').textContent = this.dataManager.apiData.exportDate;
            
            // Update statistics
            this.uiRenderer.updateStats();
            
            // Build namespace tree
            const showOnlyExposed = document.getElementById('filterExposed')?.checked ?? true;
            this.uiRenderer.buildNamespaceTree(showOnlyExposed);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show welcome screen
            this.uiRenderer.showWelcomeScreen();
            
            console.log('✅ UdonSharp API Explorer loaded successfully!');
            console.log(`📊 Loaded ${this.dataManager.apiData.totalTypes} types with ${this.dataManager.apiData.totalMembers} members`);
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.uiRenderer.showError(error.message);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        // Filter checkbox
        const filterExposed = document.getElementById('filterExposed');
        if (filterExposed) {
            filterExposed.addEventListener('change', () => {
                this.handleFilterChange();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
            // Escape to clear search
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.value = '';
                this.performSearch('');
            }
        });
        
        // Quick access buttons
        const quickButtons = document.querySelectorAll('.quick-link-grid button');
        quickButtons.forEach(button => {
            button.addEventListener('click', () => {
                const typeName = button.getAttribute('data-type');
                if (typeName) {
                    this.loadType(typeName);
                }
            });
        });
        
        // Udon example code snippets
        const udonExamples = document.querySelectorAll('.udon-equivalent[data-udon]');
        udonExamples.forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                const udonName = element.getAttribute('data-udon');
                if (udonName) {
                    Utils.copyToClipboard(udonName);
                }
            });
        });
    }

    // Handle filter change
    handleFilterChange() {
        const showOnlyExposed = document.getElementById('filterExposed').checked;
        const searchInput = document.getElementById('searchInput');
        const searchQuery = searchInput.value;
        
        // Rebuild tree with search filter if active
        this.uiRenderer.buildNamespaceTree(showOnlyExposed, searchQuery);
        
        // Refresh current type if viewing one
        if (this.dataManager.currentType) {
            this.uiRenderer.displayTypeMembers(this.dataManager.currentType);
        }
        
        // Re-run search if active
        if (searchQuery) {
            this.performSearch(searchQuery);
        }
    }

    // Load type details
    loadType(fullName) {
        console.log('Loading type:', fullName);
        
        const type = this.dataManager.findType(fullName);
        
        if (!type) {
            console.error('Type not found:', fullName);
            alert(`Type not found: ${fullName}`);
            return;
        }
        
        this.dataManager.currentType = type;
        this.uiRenderer.displayType(type);
        
        // Clear search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    // Perform search
    performSearch(query) {
        const onlyExposed = document.getElementById('filterExposed').checked;
        
        // Update namespace tree with search filter
        this.uiRenderer.buildNamespaceTree(onlyExposed, query);
        
        // Show search results or welcome screen
        if (!query || query.length < 2) {
            this.uiRenderer.showWelcomeScreen();
            return;
        }
        
        const results = this.dataManager.search(query, { onlyExposed });
        this.uiRenderer.displaySearchResults(results);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new UdonSharpExplorer();
    window.app = app; // Make available globally for onclick handlers
    
    // Make utility functions available globally
    window.copyToClipboard = (text) => Utils.copyToClipboard(text);
    window.loadType = (fullName) => app.loadType(fullName);
    
    app.initialize();
});

// Export for module usage
export default UdonSharpExplorer;