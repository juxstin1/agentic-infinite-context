import { TfIdf } from 'natural';
import { MemoryFact } from '../types';

/**
 * SemanticMemory provides BM25-based semantic search for memory facts.
 * This is data-efficient for local models - no embeddings or GPU needed.
 */
export class SemanticMemory {
  private tfidf: TfIdf;
  private factIndex: Map<number, MemoryFact>;
  private needsReindex: boolean;

  constructor() {
    this.tfidf = new TfIdf();
    this.factIndex = new Map();
    this.needsReindex = false;
  }

  /**
   * Index all facts for semantic search
   */
  indexFacts(facts: MemoryFact[]): void {
    this.tfidf = new TfIdf();
    this.factIndex.clear();

    facts.forEach((fact, index) => {
      this.tfidf.addDocument(fact.fact);
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

    const results: Array<{ fact: MemoryFact; score: number }> = [];

    this.tfidf.tfidfs(query, (docIndex, score) => {
      if (score > minScore) {
        const fact = this.factIndex.get(docIndex);
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
