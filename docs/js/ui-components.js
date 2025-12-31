/**
 * UI Components
 * Rendering functions for papers, filters, and pagination
 */

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Render a single paper card
 * @param {Object} paper - Paper object
 * @param {Function} onRemove - Callback when remove button clicked
 * @returns {string} HTML string
 */
export function renderPaperCard(paper, onRemove) {
  const categoriesHtml = paper.categories
    .map(cat => `<span class="category-tag ${cat}">${cat.replace(/-/g, ' ')}</span>`)
    .join('');

  const authorsText = paper.authors.slice(0, 5).join(', ') +
    (paper.authors.length > 5 ? ` et al. (${paper.authors.length} authors)` : '');

  return `
    <article class="paper-card" data-paper-id="${paper.id}">
      <div class="paper-header">
        <h3 class="paper-title">
          <a href="${paper.arxivUrl}" target="_blank" rel="noopener">${paper.title}</a>
        </h3>
        <div class="paper-actions">
          <a href="https://arxiv.org/pdf/${paper.id}.pdf"
             target="_blank"
             rel="noopener"
             class="btn-pdf"
             title="View PDF">
            PDF
          </a>
          <button class="btn-remove"
                  data-paper-id="${paper.id}"
                  title="Remove this paper">
            Remove
          </button>
        </div>
      </div>

      <div class="paper-meta">
        <span class="paper-meta-item">
          📅 ${formatDate(paper.publishedDate)}
        </span>
        <span class="paper-meta-item">
          📄 ${paper.id}
        </span>
      </div>

      <div class="paper-authors">
        👥 ${authorsText}
      </div>

      ${categoriesHtml ? `<div class="paper-categories">${categoriesHtml}</div>` : ''}
    </article>
  `;
}

/**
 * Render papers grid
 * @param {Array} papers - Papers to render
 * @param {HTMLElement} container - Container element
 * @param {Function} onRemove - Callback when remove button clicked
 */
export function renderPapers(papers, container, onRemove) {
  if (papers.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = papers.map(paper => renderPaperCard(paper, onRemove)).join('');
  container.innerHTML = html;

  // Attach event listeners to remove buttons
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const paperId = e.target.dataset.paperId;
      if (paperId && onRemove) {
        onRemove(paperId);
      }
    });
  });
}

/**
 * Render category filters
 * @param {Array} categories - Category definitions
 * @param {Map} counts - Category counts
 * @param {Set} selectedCategories - Selected category IDs
 * @param {HTMLElement} container - Container element
 * @param {Function} onChange - Callback when filter changes
 */
export function renderCategoryFilters(categories, counts, selectedCategories, container, onChange) {
  const html = categories.categories
    .map(cat => {
      const count = counts.get(cat.id) || 0;
      const checked = selectedCategories.has(cat.id) ? 'checked' : '';

      return `
        <label class="filter-checkbox">
          <input type="checkbox"
                 value="${cat.id}"
                 ${checked}
                 data-category="${cat.id}">
          <span>
            ${cat.name}
            <span class="filter-count">${count}</span>
          </span>
        </label>
      `;
    })
    .join('');

  container.innerHTML = html;

  // Attach event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (onChange) {
        onChange(e.target.dataset.category);
      }
    });
  });
}

/**
 * Render year filters
 * @param {Array} years - Available years
 * @param {Map} counts - Year counts
 * @param {Set} selectedYears - Selected years
 * @param {HTMLElement} container - Container element
 * @param {Function} onChange - Callback when filter changes
 */
export function renderYearFilters(years, counts, selectedYears, container, onChange) {
  const html = years
    .map(year => {
      const count = counts.get(year) || 0;
      const checked = selectedYears.has(year) ? 'checked' : '';

      return `
        <label class="filter-checkbox">
          <input type="checkbox"
                 value="${year}"
                 ${checked}
                 data-year="${year}">
          <span>
            ${year}
            <span class="filter-count">${count}</span>
          </span>
        </label>
      `;
    })
    .join('');

  container.innerHTML = html;

  // Attach event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (onChange) {
        onChange(parseInt(e.target.dataset.year));
      }
    });
  });
}

/**
 * Render pagination controls
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalResults - Total number of results
 * @param {HTMLElement} container - Container element
 * @param {Function} onPageChange - Callback when page changes
 */
export function renderPagination(currentPage, totalPages, totalResults, container, onPageChange) {
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  // Calculate page range to show
  const maxButtons = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  let html = '';

  // Previous button
  html += `
    <button class="page-button"
            ${currentPage === 1 ? 'disabled' : ''}
            data-page="${currentPage - 1}">
      ← Prev
    </button>
  `;

  // First page
  if (startPage > 1) {
    html += `
      <button class="page-button" data-page="1">1</button>
    `;
    if (startPage > 2) {
      html += `<span class="page-info">...</span>`;
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-button ${i === currentPage ? 'active' : ''}"
              data-page="${i}">
        ${i}
      </button>
    `;
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-info">...</span>`;
    }
    html += `
      <button class="page-button" data-page="${totalPages}">${totalPages}</button>
    `;
  }

  // Next button
  html += `
    <button class="page-button"
            ${currentPage === totalPages ? 'disabled' : ''}
            data-page="${currentPage + 1}">
      Next →
    </button>
  `;

  container.innerHTML = html;

  // Attach event listeners
  container.querySelectorAll('.page-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (page && onPageChange) {
        onPageChange(page);
      }
    });
  });
}

/**
 * Update results count display
 * @param {number} count - Number of results
 * @param {HTMLElement} element - Element to update
 */
export function updateResultsCount(count, element) {
  if (element) {
    element.textContent = count.toLocaleString();
  }
}

/**
 * Show/hide loading indicator
 * @param {boolean} show - Whether to show loading
 * @param {HTMLElement} loadingElement - Loading element
 * @param {HTMLElement} contentElement - Content element
 */
export function setLoading(show, loadingElement, contentElement) {
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
  if (contentElement) {
    contentElement.style.display = show ? 'none' : 'block';
  }
}

/**
 * Show/hide no results message
 * @param {boolean} show - Whether to show message
 * @param {HTMLElement} element - No results element
 */
export function showNoResults(show, element) {
  if (element) {
    element.style.display = show ? 'block' : 'none';
  }
}

/**
 * Scroll to top of page
 */
export function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type (info, success, error)
 */
export function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add styles inline (could be moved to CSS)
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    padding: '1rem 1.5rem',
    background: type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: '1000',
    animation: 'slideIn 0.3s ease-out'
  });

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export default {
  renderPaperCard,
  renderPapers,
  renderCategoryFilters,
  renderYearFilters,
  renderPagination,
  updateResultsCount,
  setLoading,
  showNoResults,
  scrollToTop,
  showToast
};
