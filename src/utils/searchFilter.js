import Fuse from 'fuse.js';

export function applySearchFilter(papers, filters) {
  const {
    searchQuery,
    sortBy,
    selectedCategories,
    selectedYears,
    viewMode,
    savedlist,
    blocklist
  } = filters;

  let filtered = [...papers];

  // Apply view mode filter first
  if (viewMode === 'saved') {
    filtered = filtered.filter(p => savedlist.has(p.id));
  } else if (viewMode === 'removed') {
    filtered = filtered.filter(p => blocklist.has(p.id));
  } else {
    // Default 'all' mode - exclude both savedlist and blocklist
    filtered = filtered.filter(p => !blocklist.has(p.id) && !savedlist.has(p.id));
  }

  // Apply category filters
  if (selectedCategories.size > 0) {
    filtered = filtered.filter(paper =>
      paper.categories?.some(cat => selectedCategories.has(cat))
    );
  }

  // Apply year filters
  if (selectedYears.size > 0) {
    filtered = filtered.filter(paper =>
      selectedYears.has(Number(paper.year))
    );
  }

  // Apply search query
  if (searchQuery.trim()) {
    const fuse = new Fuse(filtered, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'authors', weight: 1 },
        { name: 'abstract', weight: 1 }
      ],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: false
    });

    const results = fuse.search(searchQuery);
    filtered = results.map(result => result.item);
  }

  // Apply sorting
  if (sortBy === 'date-desc') {
    filtered.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
  } else if (sortBy === 'date-asc') {
    filtered.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
  }
  // 'relevance' sorting is implicit from Fuse.js results when searching

  return filtered;
}
