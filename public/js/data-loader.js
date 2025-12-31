/**
 * Data Loader
 * Handles progressive loading of index and year-based paper data
 */

class DataLoader {
  constructor() {
    this.index = null;
    this.yearData = new Map(); // Cache for loaded year data
    this.categories = null;
    this.loading = false;
  }

  /**
   * Load the lightweight index
   * @returns {Promise<Object>} Index data
   */
  async loadIndex() {
    if (this.index) {
      return this.index;
    }

    try {
      console.log('Loading index...');
      const response = await fetch('./data/index.json');

      if (!response.ok) {
        throw new Error(`Failed to load index: ${response.status}`);
      }

      this.index = await response.json();
      console.log(`Loaded ${this.index.papers.length} papers from index`);

      return this.index;
    } catch (error) {
      console.error('Error loading index:', error);
      throw error;
    }
  }

  /**
   * Load categories
   * @returns {Promise<Object>} Categories data
   */
  async loadCategories() {
    if (this.categories) {
      return this.categories;
    }

    try {
      const response = await fetch('./data/categories.json');

      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.status}`);
      }

      this.categories = await response.json();
      return this.categories;
    } catch (error) {
      console.error('Error loading categories:', error);
      throw error;
    }
  }

  /**
   * Load full paper data for a specific year
   * @param {number} year - Year to load
   * @returns {Promise<Array>} Array of papers
   */
  async loadYearData(year) {
    // Check cache first
    if (this.yearData.has(year)) {
      return this.yearData.get(year);
    }

    try {
      console.log(`Loading year ${year}...`);
      const response = await fetch(`./data/papers/${year}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load year ${year}: ${response.status}`);
      }

      const data = await response.json();
      const papers = data.papers || [];

      // Cache the data
      this.yearData.set(year, papers);

      console.log(`Loaded ${papers.length} papers from ${year}`);

      return papers;
    } catch (error) {
      console.error(`Error loading year ${year}:`, error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Load full details for multiple papers
   * @param {Array} paperIds - Array of {id, year} objects
   * @returns {Promise<Map>} Map of paperId -> fullPaper
   */
  async loadPaperDetails(paperIds) {
    const fullPapers = new Map();

    // Group by year
    const papersByYear = {};
    for (const { id, year } of paperIds) {
      if (!papersByYear[year]) {
        papersByYear[year] = [];
      }
      papersByYear[year].push(id);
    }

    // Load each year
    for (const [year, ids] of Object.entries(papersByYear)) {
      const yearPapers = await this.loadYearData(parseInt(year));

      // Find papers by ID
      for (const paper of yearPapers) {
        if (ids.includes(paper.id)) {
          fullPapers.set(paper.id, paper);
        }
      }
    }

    return fullPapers;
  }

  /**
   * Get full paper data for a single paper
   * @param {string} paperId - Paper ID
   * @param {number} year - Year
   * @returns {Promise<Object|null>} Full paper object or null
   */
  async getPaperById(paperId, year) {
    const yearPapers = await this.loadYearData(year);
    return yearPapers.find(p => p.id === paperId) || null;
  }

  /**
   * Preload data for specific years
   * @param {Array<number>} years - Years to preload
   */
  async preloadYears(years) {
    const promises = years.map(year => this.loadYearData(year));
    await Promise.all(promises);
  }

  /**
   * Clear cached year data to free memory
   * @param {number} [year] - Specific year to clear, or all if not specified
   */
  clearCache(year) {
    if (year) {
      this.yearData.delete(year);
      console.log(`Cleared cache for year ${year}`);
    } else {
      this.yearData.clear();
      console.log('Cleared all year data cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      cachedYears: Array.from(this.yearData.keys()).sort((a, b) => b - a),
      cacheSize: this.yearData.size,
      indexLoaded: this.index !== null
    };
  }
}

// Export singleton instance
export default new DataLoader();
