/**
 * Full Update Script
 * Fetches all LLM papers from arXiv and organizes them by year
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { fetchPapersMultiQuery, SEARCH_QUERIES } from './fetch-arxiv.js';
import { categorizePapers } from './categorize-papers.js';
import { deduplicatePapers, logDeduplicationStats, mergePapers, logMergeStats } from './utils/deduplicator.js';
import { buildAndSaveIndex } from './build-index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const PAPERS_DIR = path.join(DATA_DIR, 'papers');
const CATEGORIES_PATH = path.join(DATA_DIR, 'categories.json');

/**
 * Load category definitions
 * @returns {Promise<Array>} Array of categories
 */
async function loadCategories() {
  const data = JSON.parse(await fs.readFile(CATEGORIES_PATH, 'utf-8'));
  return data.categories;
}

/**
 * Load existing papers for a specific year
 * @param {number} year - Year to load
 * @returns {Promise<Array>} Array of papers (empty if file doesn't exist)
 */
async function loadYearPapers(year) {
  const yearPath = path.join(PAPERS_DIR, `${year}.json`);

  try {
    const data = JSON.parse(await fs.readFile(yearPath, 'utf-8'));
    return data.papers || [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Save papers for a specific year
 * @param {number} year - Year
 * @param {Array} papers - Papers to save
 */
async function saveYearPapers(year, papers) {
  const yearPath = path.join(PAPERS_DIR, `${year}.json`);

  await fs.mkdir(PAPERS_DIR, { recursive: true });

  const data = {
    year,
    count: papers.length,
    papers
  };

  await fs.writeFile(yearPath, JSON.stringify(data, null, 2));

  console.log(chalk.green(`✓ Saved ${papers.length} papers to ${year}.json`));
}

/**
 * Organize papers by year
 * @param {Array} papers - All papers
 * @returns {Object} Papers grouped by year {2024: [...], 2023: [...], ...}
 */
function organizePapersByYear(papers) {
  const papersByYear = {};

  for (const paper of papers) {
    const year = parseInt(paper.publishedDate.substring(0, 4));

    if (!papersByYear[year]) {
      papersByYear[year] = [];
    }

    papersByYear[year].push(paper);
  }

  return papersByYear;
}

/**
 * Main update function
 * @param {Object} options - Update options
 */
async function updateFull(options = {}) {
  const {
    startDate = '2020-01-01',
    endDate = null,
    testMode = false
  } = options;

  try {
    console.log(chalk.bold.cyan('\n' + '='.repeat(70)));
    console.log(chalk.bold.cyan('  arXiv LLM Papers - Full Update'));
    console.log(chalk.bold.cyan('='.repeat(70)));

    if (testMode) {
      console.log(chalk.bold.yellow('\n⚠ TEST MODE: Only fetching first 2 queries with limited results\n'));
    }

    // Load categories
    console.log(chalk.blue('\n📂 Loading categories...'));
    const categories = await loadCategories();
    console.log(chalk.green(`✓ Loaded ${categories.length} categories`));

    // Fetch papers
    const queriesToUse = testMode ? SEARCH_QUERIES.slice(0, 2) : SEARCH_QUERIES;
    const fetchOptions = {
      startDate,
      endDate,
      maxResults: testMode ? 50 : Infinity
    };

    const papers = await fetchPapersMultiQuery(queriesToUse, fetchOptions);

    if (papers.length === 0) {
      console.log(chalk.yellow('\n⚠ No papers fetched. Exiting.\n'));
      return;
    }

    // Add fetchedAt timestamp
    const timestamp = new Date().toISOString();
    papers.forEach(paper => {
      paper.fetchedAt = timestamp;
    });

    // Categorize papers
    const categorizedPapers = categorizePapers(papers, categories);

    // Deduplicate
    const dedupResult = deduplicatePapers(categorizedPapers);
    logDeduplicationStats(dedupResult);

    // Organize by year
    console.log(chalk.blue('\n📅 Organizing papers by year...'));
    const papersByYear = organizePapersByYear(dedupResult.unique);
    const years = Object.keys(papersByYear).sort((a, b) => b - a);

    console.log(chalk.green(`✓ Papers span ${years.length} years: ${years[years.length - 1]} - ${years[0]}`));

    // Merge with existing data and save
    console.log(chalk.blue('\n💾 Merging with existing data and saving...'));

    for (const year of years) {
      const newPapers = papersByYear[year];
      const existingPapers = await loadYearPapers(year);

      if (existingPapers.length > 0) {
        console.log(chalk.gray(`\n  ${year}: Merging with ${existingPapers.length} existing papers...`));
        const mergeResult = mergePapers(existingPapers, newPapers);
        await saveYearPapers(year, mergeResult.merged);
        console.log(chalk.cyan(`    Added: ${mergeResult.added}, Updated: ${mergeResult.updated}`));
      } else {
        console.log(chalk.gray(`\n  ${year}: New year file`));
        await saveYearPapers(year, newPapers);
      }
    }

    // Build index
    await buildAndSaveIndex();

    // Final summary
    console.log(chalk.bold.green('\n' + '='.repeat(70)));
    console.log(chalk.bold.green('✓ Full update complete!'));
    console.log(chalk.bold.green('='.repeat(70)));

    console.log(chalk.cyan('\nSummary:'));
    console.log(chalk.gray(`  Total papers fetched: ${papers.length}`));
    console.log(chalk.gray(`  Unique papers: ${dedupResult.unique.length}`));
    console.log(chalk.gray(`  Duplicates removed: ${dedupResult.duplicates.length}`));
    console.log(chalk.gray(`  Years: ${years.join(', ')}`));
    console.log(chalk.gray(`  Date range: ${startDate} to ${endDate || 'now'}`));

    console.log(chalk.green('\n✓ Data ready for GitHub Pages deployment!\n'));

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Update failed:'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Check for test mode flag
if (args.includes('--test')) {
  options.testMode = true;
}

// Check for date range
const startDateArg = args.find(arg => arg.startsWith('--start-date='));
if (startDateArg) {
  options.startDate = startDateArg.split('=')[1];
}

const endDateArg = args.find(arg => arg.startsWith('--end-date='));
if (endDateArg) {
  options.endDate = endDateArg.split('=')[1];
}

// If running this script directly
const scriptPath = import.meta.url;
const argPath = `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (scriptPath === argPath || scriptPath.endsWith('update-full.js')) {
  updateFull(options);
}

export default updateFull;
