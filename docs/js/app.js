/**
 * Main Application
 * Orchestrates data loading, search, filtering, and UI rendering
 */

import dataLoader from './data-loader.js';
import SearchFilter from './search.js';
import {
  renderPapers,
  renderCategoryFilters,
  renderYearFilters,
  renderPagination,
  renderCategoryLegend,
  updateResultsCount,
  setLoading,
  showNoResults,
  scrollToTop,
  showToast
} from './ui-components.js';

class App {
  constructor() {
    this.searchFilter = new SearchFilter();
    this.currentPage = 1;
    this.papersPerPage = 50;
    this.filteredPapers = [];
    this.categories = null;
    this.customKeywords = this.loadCustomKeywords();

    // DOM elements
    this.elements = {
      loading: document.getElementById('loading'),
      papersContainer: document.getElementById('papers-container'),
      noResults: document.getElementById('no-results'),
      searchInput: document.getElementById('search-input'),
      clearSearch: document.getElementById('clear-search'),
      sortSelect: document.getElementById('sort-select'),
      categoryFilters: document.getElementById('category-filters'),
      yearFilters: document.getElementById('year-filters'),
      resetFilters: document.getElementById('reset-filters'),
      resultsCount: document.getElementById('results-count'),
      totalPapers: document.getElementById('total-papers'),
      lastUpdated: document.getElementById('last-updated'),
      pagination: document.getElementById('pagination'),
      blocklistCount: document.getElementById('blocklist-count'),
      exportBlocklist: document.getElementById('export-blocklist'),
      clearBlocklist: document.getElementById('clear-blocklist'),
      savedlistCount: document.getElementById('savedlist-count'),
      exportSavedlist: document.getElementById('export-savedlist'),
      clearSavedlist: document.getElementById('clear-savedlist'),
      viewAll: document.getElementById('view-all'),
      viewSaved: document.getElementById('view-saved'),
      viewRemoved: document.getElementById('view-removed'),
      themeToggle: document.getElementById('theme-toggle'),
      toggleLegend: document.getElementById('toggle-legend'),
      categoryLegend: document.getElementById('category-legend')
    };

    // Initialize theme
    this.initializeTheme();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('Initializing application...');

      // Load data
      await this.loadData();

      // Set up event listeners
      this.setupEventListeners();

      // Initial render
      this.applyFiltersAndRender();

      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.elements.loading.innerHTML = `
        <p style="color: red;">Failed to load data. Please refresh the page.</p>
        <p style="font-size: 0.9rem; color: #666;">${error.message}</p>
      `;
    }
  }

  /**
   * Load initial data
   */
  async loadData() {
    setLoading(true, this.elements.loading, this.elements.papersContainer);

    // Load index and categories in parallel
    const [index, categories] = await Promise.all([
      dataLoader.loadIndex(),
      dataLoader.loadCategories()
    ]);

    this.categories = categories;

    // Initialize search
    this.searchFilter.initializeSearch(index.papers);

    // Update header stats
    if (this.elements.totalPapers) {
      this.elements.totalPapers.textContent = index.meta.totalPapers.toLocaleString();
    }

    if (this.elements.lastUpdated) {
      const lastUpdated = new Date(index.meta.lastUpdated);
      this.elements.lastUpdated.textContent = lastUpdated.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    // Update blocklist and savedlist counts
    this.updateBlocklistCount();
    this.updateSavedlistCount();

    setLoading(false, this.elements.loading, this.elements.papersContainer);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search input with debouncing
    let searchTimeout;
    this.elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchFilter.setSearchQuery(e.target.value);
        this.currentPage = 1;
        this.applyFiltersAndRender();
      }, 300);
    });

    // Clear search button
    this.elements.clearSearch.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.searchFilter.setSearchQuery('');
      this.currentPage = 1;
      this.applyFiltersAndRender();
    });

    // Sort select
    this.elements.sortSelect.addEventListener('change', (e) => {
      this.searchFilter.setSortBy(e.target.value);
      this.currentPage = 1;
      this.applyFiltersAndRender();
    });

    // Reset filters button
    this.elements.resetFilters.addEventListener('click', () => {
      this.resetAllFilters();
    });

    // Export blocklist
    this.elements.exportBlocklist.addEventListener('click', () => {
      this.searchFilter.exportBlocklist();
      showToast('Blocklist exported successfully', 'success');
    });

    // Clear blocklist
    this.elements.clearBlocklist.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire blocklist?')) {
        this.searchFilter.clearBlocklist();
        this.updateBlocklistCount();
        this.applyFiltersAndRender();
        showToast('Blocklist cleared', 'success');
      }
    });

    // Export savedlist
    this.elements.exportSavedlist.addEventListener('click', () => {
      this.searchFilter.exportSavedlist();
      showToast('Savedlist exported successfully', 'success');
    });

    // Clear savedlist
    this.elements.clearSavedlist.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire savedlist?')) {
        this.searchFilter.clearSavedlist();
        this.updateSavedlistCount();
        this.applyFiltersAndRender();
        showToast('Savedlist cleared', 'success');
      }
    });

    // View mode toggles
    this.elements.viewAll.addEventListener('click', () => {
      this.setViewMode('all');
    });

    this.elements.viewSaved.addEventListener('click', () => {
      this.setViewMode('saved');
    });

    this.elements.viewRemoved.addEventListener('click', () => {
      this.setViewMode('removed');
    });

    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Legend toggle
    this.elements.toggleLegend.addEventListener('click', () => {
      this.toggleCategoryLegend();
    });
  }

  /**
   * Load custom keywords from localStorage
   */
  loadCustomKeywords() {
    try {
      const keywords = JSON.parse(localStorage.getItem('customKeywords') || '{}');
      return keywords;
    } catch (error) {
      console.error('Error loading custom keywords:', error);
      return {};
    }
  }

  /**
   * Save custom keywords to localStorage
   */
  saveCustomKeywords() {
    try {
      localStorage.setItem('customKeywords', JSON.stringify(this.customKeywords));
    } catch (error) {
      console.error('Error saving custom keywords:', error);
    }
  }

  /**
   * Toggle category legend visibility
   */
  toggleCategoryLegend() {
    const legend = this.elements.categoryLegend;
    const button = this.elements.toggleLegend;
    const toggleIcon = button.querySelector('.toggle-icon');
    const toggleText = button.querySelector('span:last-child');

    if (!this.categories) {
      showToast('Loading categories...', 'info');
      return;
    }

    if (legend.style.display === 'none') {
      legend.style.display = 'block';
      toggleIcon.textContent = '▼';
      toggleText.textContent = 'Hide Legend';

      // Always re-render the legend to ensure it's up to date
      this.renderLegend();
    } else {
      legend.style.display = 'none';
      toggleIcon.textContent = '▶';
      toggleText.textContent = 'Show Legend';
    }
  }

  /**
   * Render category legend
   */
  renderLegend() {
    if (!this.categories) return;

    renderCategoryLegend(
      this.categories,
      this.customKeywords,
      this.elements.categoryLegend,
      (categoryId, keyword) => this.addKeyword(categoryId, keyword)
    );
  }

  /**
   * Add keyword to category
   */
  addKeyword(categoryId, keyword) {
    // Initialize array if it doesn't exist
    if (!this.customKeywords[categoryId]) {
      this.customKeywords[categoryId] = [];
    }

    // Check if keyword already exists
    if (this.customKeywords[categoryId].includes(keyword)) {
      showToast('Keyword already exists', 'info');
      return;
    }

    // Add keyword
    this.customKeywords[categoryId].push(keyword);
    this.saveCustomKeywords();

    // Re-render legend
    this.renderLegend();

    showToast(`Added "${keyword}" to ${categoryId}`, 'success');
  }

  /**
   * Initialize theme from localStorage
   */
  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeIcon(newTheme);
  }

  /**
   * Update theme toggle icon
   */
  updateThemeIcon(theme) {
    const icon = this.elements.themeToggle.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
  }

  /**
   * Reset all filters
   */
  resetAllFilters() {
    this.elements.searchInput.value = '';
    this.searchFilter.resetFilters();
    this.currentPage = 1;
    this.applyFiltersAndRender();
    showToast('Filters reset', 'info');
  }

  /**
   * Apply filters and render results
   */
  applyFiltersAndRender() {
    // Apply filters
    this.filteredPapers = this.searchFilter.applyFilters();

    // Render category filters
    const categoryCounts = this.searchFilter.getCategoryCounts();
    renderCategoryFilters(
      this.categories,
      categoryCounts,
      this.searchFilter.filters.categories,
      this.elements.categoryFilters,
      (category) => {
        this.searchFilter.toggleCategory(category);
        this.currentPage = 1;
        this.applyFiltersAndRender();
      }
    );

    // Render year filters
    const yearCounts = this.searchFilter.getYearCounts();
    const years = Array.from(yearCounts.keys()).sort((a, b) => b - a);
    renderYearFilters(
      years,
      yearCounts,
      this.searchFilter.filters.years,
      this.elements.yearFilters,
      (year) => {
        this.searchFilter.toggleYear(year);
        this.currentPage = 1;
        this.applyFiltersAndRender();
      }
    );

    // Calculate pagination
    const totalPages = Math.ceil(this.filteredPapers.length / this.papersPerPage);
    const startIndex = (this.currentPage - 1) * this.papersPerPage;
    const endIndex = startIndex + this.papersPerPage;
    const pagePapers = this.filteredPapers.slice(startIndex, endIndex);

    // Render papers
    if (this.filteredPapers.length === 0) {
      showNoResults(true, this.elements.noResults);
      this.elements.papersContainer.innerHTML = '';
      this.elements.pagination.innerHTML = '';
    } else {
      showNoResults(false, this.elements.noResults);
      renderPapers(
        pagePapers,
        this.elements.papersContainer,
        {
          onSave: (paperId) => this.toggleSavePaper(paperId),
          onRemove: (paperId) => this.removePaper(paperId)
        },
        this.searchFilter
      );

      // Render pagination
      renderPagination(
        this.currentPage,
        totalPages,
        this.filteredPapers.length,
        this.elements.pagination,
        (page) => {
          this.currentPage = page;
          this.applyFiltersAndRender();
          scrollToTop();
        }
      );
    }

    // Update results count
    updateResultsCount(this.filteredPapers.length, this.elements.resultsCount);
  }

  /**
   * Remove paper from view
   * @param {string} paperId - Paper ID to remove
   */
  removePaper(paperId) {
    if (confirm('Remove this paper from your view? You can export your blocklist later.')) {
      this.searchFilter.blockPaper(paperId);
      this.updateBlocklistCount();
      this.applyFiltersAndRender();
      showToast('Paper removed', 'success');
    }
  }

  /**
   * Toggle save paper
   * @param {string} paperId - Paper ID to save/unsave
   */
  toggleSavePaper(paperId) {
    if (this.searchFilter.savedlist.has(paperId)) {
      this.searchFilter.unsavePaper(paperId);
      showToast('Paper unsaved', 'info');
    } else {
      this.searchFilter.savePaper(paperId);
      showToast('Paper saved', 'success');
    }
    this.updateSavedlistCount();
    this.applyFiltersAndRender();
  }

  /**
   * Set view mode
   * @param {string} mode - View mode ('all', 'saved', 'removed')
   */
  setViewMode(mode) {
    this.searchFilter.setViewMode(mode);
    this.currentPage = 1;
    this.applyFiltersAndRender();
    this.updateViewModeButtons(mode);

    const modeNames = { all: 'All Papers', saved: 'Saved Papers', removed: 'Removed Papers' };
    showToast(`Viewing: ${modeNames[mode]}`, 'info');
  }

  /**
   * Update view mode button states
   * @param {string} activeMode - Current active mode
   */
  updateViewModeButtons(activeMode) {
    const buttons = {
      all: this.elements.viewAll,
      saved: this.elements.viewSaved,
      removed: this.elements.viewRemoved
    };

    Object.entries(buttons).forEach(([mode, button]) => {
      if (button) {
        if (mode === activeMode) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
  }

  /**
   * Update blocklist count display
   */
  updateBlocklistCount() {
    if (this.elements.blocklistCount) {
      this.elements.blocklistCount.textContent = this.searchFilter.blocklist.size;
    }
  }

  /**
   * Update savedlist count display
   */
  updateSavedlistCount() {
    if (this.elements.savedlistCount) {
      this.elements.savedlistCount.textContent = this.searchFilter.savedlist.size;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
});

export default App;
