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
 * @param {Object} callbacks - Callbacks object {onSave, onRemove, isSaved}
 * @returns {string} HTML string
 */
export function renderPaperCard(paper, callbacks) {
  const { onSave, onRemove, isSaved } = callbacks;
  const categoriesHtml = paper.categories
    .map(cat => `<span class="category-tag ${cat}">${cat.replace(/-/g, ' ')}</span>`)
    .join('');

  const authorsText = paper.authors.slice(0, 5).join(', ') +
    (paper.authors.length > 5 ? ` et al. (${paper.authors.length} authors)` : '');

  const abstractPreview = paper.abstract ? truncate(paper.abstract, 200) : '';
  const hasAbstract = paper.abstract && paper.abstract.length > 0;

  return `
    <article class="paper-card" data-paper-id="${paper.id}">
      <div class="paper-header">
        <h3 class="paper-title">
          <a href="https://arxiv.org/pdf/${paper.id}.pdf" target="_blank" rel="noopener">${paper.title}</a>
        </h3>
        <div class="paper-actions">
          <a href="${paper.arxivUrl || `https://arxiv.org/abs/${paper.id}`}"
             target="_blank"
             rel="noopener"
             class="btn-abstract"
             title="View arXiv page">
            arXiv
          </a>
          <button class="btn-save ${isSaved ? 'saved' : ''}"
                  data-paper-id="${paper.id}"
                  title="${isSaved ? 'Unsave this paper' : 'Save this paper'}">
            ${isSaved ? '★ Saved' : '☆ Save'}
          </button>
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

      ${hasAbstract ? `
        <div class="paper-abstract-section">
          <button class="btn-toggle-abstract" data-paper-id="${paper.id}">
            <span class="toggle-icon">▶</span>
            <span class="toggle-text">Show Abstract</span>
          </button>
          <div class="paper-abstract" style="display: none;">
            ${paper.abstract}
          </div>
        </div>
      ` : ''}
    </article>
  `;
}

/**
 * Render papers grid
 * @param {Array} papers - Papers to render
 * @param {HTMLElement} container - Container element
 * @param {Object} callbacks - Callbacks object {onSave, onRemove}
 * @param {Object} searchFilter - SearchFilter instance for checking saved state
 */
export function renderPapers(papers, container, callbacks, searchFilter) {
  if (papers.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = papers.map(paper => {
    const isSaved = searchFilter.savedlist.has(paper.id);
    return renderPaperCard(paper, { ...callbacks, isSaved });
  }).join('');
  container.innerHTML = html;

  // Attach event listeners to save buttons
  container.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const paperId = e.target.dataset.paperId;
      if (paperId && callbacks.onSave) {
        callbacks.onSave(paperId);
      }
    });
  });

  // Attach event listeners to remove buttons
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const paperId = e.target.dataset.paperId;
      if (paperId && callbacks.onRemove) {
        callbacks.onRemove(paperId);
      }
    });
  });

  // Attach event listeners to toggle abstract buttons
  container.querySelectorAll('.btn-toggle-abstract').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget;
      const paperId = button.dataset.paperId;
      const paperCard = button.closest('.paper-card');
      const abstractDiv = paperCard.querySelector('.paper-abstract');
      const toggleIcon = button.querySelector('.toggle-icon');
      const toggleText = button.querySelector('.toggle-text');

      if (abstractDiv.style.display === 'none') {
        abstractDiv.style.display = 'block';
        toggleIcon.textContent = '▼';
        toggleText.textContent = 'Hide Abstract';
        button.classList.add('expanded');
      } else {
        abstractDiv.style.display = 'none';
        toggleIcon.textContent = '▶';
        toggleText.textContent = 'Show Abstract';
        button.classList.remove('expanded');
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
 * Render category legend with keywords
 * @param {Object} categories - Categories data
 * @param {Object} customKeywords - Custom keywords map {categoryId: [keywords]}
 * @param {Array} customCategories - Array of custom category definitions
 * @param {HTMLElement} container - Container element
 * @param {Object} callbacks - {onAddKeyword, onAddCategory, onDeleteCategory}
 */
export function renderCategoryLegend(categories, customKeywords, customCategories, container, callbacks) {
  const { onAddKeyword, onAddCategory, onDeleteCategory } = callbacks;

  // Combine default and custom categories
  const allCategories = [
    ...categories.categories.map(cat => ({ ...cat, isCustom: false })),
    ...customCategories.map(cat => ({ ...cat, isCustom: true }))
  ];

  const categoriesHtml = allCategories
    .map(cat => {
      const defaultKeywords = cat.keywords || [];
      const custom = customKeywords[cat.id] || [];
      const allKeywords = [...defaultKeywords, ...custom];

      return `
        <div class="legend-category ${cat.isCustom ? 'custom-category' : ''}">
          <div class="legend-category-header">
            <span class="category-tag ${cat.id}">${cat.name}</span>
            ${cat.isCustom ? `<button class="btn-delete-category" data-category="${cat.id}" title="Delete category">×</button>` : ''}
          </div>
          <p class="legend-description">${cat.description || 'Custom category'}</p>
          <div class="legend-keywords">
            ${allKeywords.length > 0 ? allKeywords.map(kw => {
              const isCustom = custom.includes(kw) || cat.isCustom;
              return `<span class="keyword-tag ${isCustom ? 'custom' : ''}" title="${isCustom ? 'Custom keyword' : 'Default keyword'}">${kw}</span>`;
            }).join('') : '<span class="no-keywords">No keywords yet</span>'}
          </div>
          <div class="add-keyword-form">
            <input
              type="text"
              class="keyword-input"
              placeholder="Add keyword..."
              data-category="${cat.id}"
            >
            <button class="btn-add-keyword" data-category="${cat.id}" title="Add keyword">+</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Add new category form at the top
  const newCategoryForm = `
    <div class="new-category-form">
      <h4>Create New Category</h4>
      <input
        type="text"
        id="new-category-name"
        class="new-category-input"
        placeholder="Category name (e.g., 'Vision Models')"
      >
      <input
        type="text"
        id="new-category-keywords"
        class="new-category-input"
        placeholder="Keywords (comma-separated, e.g., 'vision, image, visual')"
      >
      <button id="btn-create-category" class="btn-create-category">Create Category</button>
    </div>
    <div class="legend-divider"></div>
  `;

  container.innerHTML = newCategoryForm + categoriesHtml;

  // Attach event listener for creating new category
  const createBtn = container.querySelector('#btn-create-category');
  createBtn.addEventListener('click', () => {
    const nameInput = container.querySelector('#new-category-name');
    const keywordsInput = container.querySelector('#new-category-keywords');

    const name = nameInput.value.trim();
    const keywordsStr = keywordsInput.value.trim();

    if (name && keywordsStr && onAddCategory) {
      const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
      if (keywords.length > 0) {
        onAddCategory(name, keywords);
        nameInput.value = '';
        keywordsInput.value = '';
      }
    }
  });

  // Attach event listeners to delete category buttons
  container.querySelectorAll('.btn-delete-category').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const categoryId = e.target.dataset.category;
      if (onDeleteCategory) {
        onDeleteCategory(categoryId);
      }
    });
  });

  // Attach event listeners to add keyword buttons
  container.querySelectorAll('.btn-add-keyword').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const categoryId = e.target.dataset.category;
      const input = container.querySelector(`.keyword-input[data-category="${categoryId}"]`);
      const keyword = input.value.trim().toLowerCase();

      if (keyword && onAddKeyword) {
        onAddKeyword(categoryId, keyword);
        input.value = '';
      }
    });
  });

  // Also allow Enter key to add keyword
  container.querySelectorAll('.keyword-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const categoryId = e.target.dataset.category;
        const keyword = e.target.value.trim().toLowerCase();

        if (keyword && onAddKeyword) {
          onAddKeyword(categoryId, keyword);
          e.target.value = '';
        }
      }
    });
  });
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
  renderCategoryLegend,
  updateResultsCount,
  setLoading,
  showNoResults,
  scrollToTop,
  showToast
};
