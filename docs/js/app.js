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
      clearBlocklist: document.getElementById('clear-blocklist')
    };
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

    // Update blocklist count
    this.updateBlocklistCount();

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
      renderPapers(pagePapers, this.elements.papersContainer, (paperId) => {
        this.removePaper(paperId);
      });

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
   * Update blocklist count display
   */
  updateBlocklistCount() {
    if (this.elements.blocklistCount) {
      this.elements.blocklistCount.textContent = this.searchFilter.blocklist.size;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
});

export default App;
