/**
 * Search and Filter
 * Handles fuzzy search with Fuse.js and filtering logic
 */

class SearchFilter {
  constructor() {
    this.fuse = null;
    this.papers = [];
    this.filters = {
      searchQuery: '',
      categories: new Set(),
      years: new Set(),
      sortBy: 'date-desc'
    };
    this.blocklist = this.loadBlocklist();
  }

  /**
   * Initialize Fuse.js search
   * @param {Array} papers - Papers to search
   */
  initializeSearch(papers) {
    this.papers = papers;

    const fuseOptions = {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'authors', weight: 0.2 },
        { name: 'id', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true
    };

    this.fuse = new Fuse(papers, fuseOptions);
    console.log('Search initialized with', papers.length, 'papers');
  }

  /**
   * Load blocklist from localStorage
   * @returns {Set} Set of blocked paper IDs
   */
  loadBlocklist() {
    try {
      const blocked = JSON.parse(localStorage.getItem('blocklist') || '[]');
      return new Set(blocked);
    } catch (error) {
      console.error('Error loading blocklist:', error);
      return new Set();
    }
  }

  /**
   * Save blocklist to localStorage
   */
  saveBlocklist() {
    try {
      localStorage.setItem('blocklist', JSON.stringify(Array.from(this.blocklist)));
    } catch (error) {
      console.error('Error saving blocklist:', error);
    }
  }

  /**
   * Add paper to blocklist
   * @param {string} paperId - Paper ID to block
   */
  blockPaper(paperId) {
    this.blocklist.add(paperId);
    this.saveBlocklist();
  }

  /**
   * Remove paper from blocklist
   * @param {string} paperId - Paper ID to unblock
   */
  unblockPaper(paperId) {
    this.blocklist.delete(paperId);
    this.saveBlocklist();
  }

  /**
   * Clear all blocklist
   */
  clearBlocklist() {
    this.blocklist.clear();
    this.saveBlocklist();
  }

  /**
   * Export blocklist as JSON file
   */
  exportBlocklist() {
    const blocked = Array.from(this.blocklist).map(id => ({
      id,
      reason: 'Manually removed via UI',
      blockedAt: new Date().toISOString(),
      blockedBy: 'manual'
    }));

    const blob = new Blob([JSON.stringify({ blocked }, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blocklist-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Set search query
   * @param {string} query - Search query
   */
  setSearchQuery(query) {
    this.filters.searchQuery = query.trim();
  }

  /**
   * Toggle category filter
   * @param {string} category - Category ID
   */
  toggleCategory(category) {
    if (this.filters.categories.has(category)) {
      this.filters.categories.delete(category);
    } else {
      this.filters.categories.add(category);
    }
  }

  /**
   * Toggle year filter
   * @param {number} year - Year
   */
  toggleYear(year) {
    if (this.filters.years.has(year)) {
      this.filters.years.delete(year);
    } else {
      this.filters.years.add(year);
    }
  }

  /**
   * Set sort order
   * @param {string} sortBy - Sort option (date-desc, date-asc, relevance)
   */
  setSortBy(sortBy) {
    this.filters.sortBy = sortBy;
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    this.filters.searchQuery = '';
    this.filters.categories.clear();
    this.filters.years.clear();
    this.filters.sortBy = 'date-desc';
  }

  /**
   * Apply all filters and return filtered papers
   * @returns {Array} Filtered and sorted papers
   */
  applyFilters() {
    let results = this.papers;

    // Apply blocklist filter
    results = results.filter(paper => !this.blocklist.has(paper.id));

    // Apply category filter
    if (this.filters.categories.size > 0) {
      results = results.filter(paper =>
        paper.categories.some(cat => this.filters.categories.has(cat))
      );
    }

    // Apply year filter
    if (this.filters.years.size > 0) {
      results = results.filter(paper => this.filters.years.has(paper.year));
    }

    // Apply search query
    if (this.filters.searchQuery) {
      const searchResults = this.fuse.search(this.filters.searchQuery);
      const searchIds = new Set(searchResults.map(r => r.item.id));
      results = results.filter(paper => searchIds.has(paper.id));

      // If sorting by relevance, use Fuse.js scores
      if (this.filters.sortBy === 'relevance') {
        const scoreMap = new Map(searchResults.map(r => [r.item.id, r.score]));
        results.sort((a, b) => (scoreMap.get(a.id) || 1) - (scoreMap.get(b.id) || 1));
        return results;
      }
    }

    // Apply sorting
    results = this.sortPapers(results);

    return results;
  }

  /**
   * Sort papers
   * @param {Array} papers - Papers to sort
   * @returns {Array} Sorted papers
   */
  sortPapers(papers) {
    const sorted = [...papers];

    switch (this.filters.sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
        break;

      case 'date-asc':
        sorted.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
        break;

      case 'relevance':
        // Handled in applyFilters when search is active
        // Default to date-desc if no search
        if (!this.filters.searchQuery) {
          sorted.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
        }
        break;
    }

    return sorted;
  }

  /**
   * Get filter summary
   * @returns {Object} Filter summary
   */
  getFilterSummary() {
    return {
      searchActive: this.filters.searchQuery.length > 0,
      categoriesActive: this.filters.categories.size,
      yearsActive: this.filters.years.size,
      blockedCount: this.blocklist.size,
      sortBy: this.filters.sortBy
    };
  }

  /**
   * Get category counts for all papers
   * @returns {Map} Map of category -> count
   */
  getCategoryCounts() {
    const counts = new Map();

    for (const paper of this.papers) {
      if (this.blocklist.has(paper.id)) continue;

      for (const category of paper.categories) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
    }

    return counts;
  }

  /**
   * Get year counts for all papers
   * @returns {Map} Map of year -> count
   */
  getYearCounts() {
    const counts = new Map();

    for (const paper of this.papers) {
      if (this.blocklist.has(paper.id)) continue;

      counts.set(paper.year, (counts.get(paper.year) || 0) + 1);
    }

    return counts;
  }
}

export default SearchFilter;
