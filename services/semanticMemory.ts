import { MemoryFact } from '../types';

/**
 * Simple browser-compatible BM25 implementation
 * No dependencies on Node.js modules
 */
class SimpleBM25 {
  private documents: string[] = [];
  private documentTermFreqs: Map<number, Map<string, number>>[] = [];
  private documentLengths: number[] = [];
  private avgDocLength: number = 0;
  private idf: Map<string, number> = new Map();

  // BM25 parameters
  private k1 = 1.5;
  private b = 0.75;

  addDocument(text: string): void {
    const docIndex = this.documents.length;
    this.documents.push(text);

    // Tokenize and calculate term frequencies
    const terms = this.tokenize(text);
    const termFreq = new Map<string, number>();

    terms.forEach(term => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    });

    this.documentTermFreqs.push(termFreq);
    this.documentLengths.push(terms.length);

    // Recalculate IDF when adding documents
    this.calculateIDF();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2); // Filter out very short words
  }

  private calculateIDF(): void {
    const N = this.documents.length;
    if (N === 0) return;

    this.avgDocLength = this.documentLengths.reduce((a, b) => a + b, 0) / N;

    // Count document frequency for each term
    const df = new Map<string, number>();

    this.documentTermFreqs.forEach(termFreq => {
      termFreq.forEach((_, term) => {
        df.set(term, (df.get(term) || 0) + 1);
      });
    });

    // Calculate IDF for each term
    this.idf.clear();
    df.forEach((docFreq, term) => {
      const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
      this.idf.set(term, idf);
    });
  }

  search(query: string): Array<{ index: number; score: number }> {
    const queryTerms = this.tokenize(query);
    const scores: Array<{ index: number; score: number }> = [];

    this.documentTermFreqs.forEach((termFreq, docIndex) => {
      let score = 0;
      const docLength = this.documentLengths[docIndex];

      queryTerms.forEach(term => {
        const tf = termFreq.get(term) || 0;
        const idf = this.idf.get(term) || 0;

        if (tf > 0) {
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
          score += idf * (numerator / denominator);
        }
      });

      if (score > 0) {
        scores.push({ index: docIndex, score });
      }
    });

    return scores.sort((a, b) => b.score - a.score);
  }
}

/**
 * SemanticMemory provides BM25-based semantic search for memory facts.
 * This is data-efficient for local models - no embeddings or GPU needed.
 * Browser-compatible with no Node.js dependencies.
 */
export class SemanticMemory {
  private bm25: SimpleBM25;
  private factIndex: Map<number, MemoryFact>;
  private needsReindex: boolean;

  constructor() {
    this.bm25 = new SimpleBM25();
    this.factIndex = new Map();
    this.needsReindex = false;
  }

  /**
   * Index all facts for semantic search
   */
  indexFacts(facts: MemoryFact[]): void {
    this.bm25 = new SimpleBM25();
    this.factIndex.clear();

    facts.forEach((fact, index) => {
      this.bm25.addDocument(fact.fact);
      this.factIndex.set(index, fact);
    });

    this.needsReindex = false;
  }

  /**
   * Find semantically similar facts using BM25
   */
  findRelevant(query: string, limit: number = 5, minScore: number = 0.1): MemoryFact[] {
    if (this.needsReindex) {
      console.warn('SemanticMemory needs reindexing');
      return [];
    }

    const searchResults = this.bm25.search(query);
    const results: Array<{ fact: MemoryFact; score: number }> = [];

    searchResults.forEach(({ index, score }) => {
      if (score > minScore) {
        const fact = this.factIndex.get(index);
        if (fact) {
          // Boost score by confidence and recency
          const confidenceBoost = (fact.confidence ?? 0.5) * 0.3;
          const recencyBoost = this.calculateRecencyBoost(fact);
          const usageBoost = this.calculateUsageBoost(fact);

          const adjustedScore = score + confidenceBoost + recencyBoost + usageBoost;

          results.push({ fact, score: adjustedScore });
        }
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.fact);
  }

  /**
   * Calculate recency boost - recent facts are more relevant
   */
  private calculateRecencyBoost(fact: MemoryFact): number {
    const daysAgo = (Date.now() - new Date(fact.last_seen).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 7 - daysAgo) * 0.05; // Up to 0.35 boost for very recent facts
  }

  /**
   * Calculate usage boost - frequently used facts are more relevant
   */
  private calculateUsageBoost(fact: MemoryFact): number {
    const usageCount = fact.usage_count ?? 0;
    const successCount = fact.success_count ?? 0;

    if (usageCount === 0) return 0;

    const successRate = successCount / usageCount;
    return Math.min(usageCount * 0.02, 0.2) * successRate; // Up to 0.2 boost
  }

  /**
   * Mark that reindexing is needed (call after facts change)
   */
  markDirty(): void {
    this.needsReindex = true;
  }
}
