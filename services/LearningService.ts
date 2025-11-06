import { MemoryFact, Message, MessageFeedback, ToolMemory, User } from '../types';
import { createId } from '../utils/ids';

/**
 * Simple browser-compatible BM25 implementation for semantic search
 * No dependencies on Node.js modules
 */
class SimpleBM25 {
  private documents: string[] = [];
  private documentTermFreqs: Map<string, number>[] = [];
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
      .filter(term => term.length > 2);
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

  clear(): void {
    this.documents = [];
    this.documentTermFreqs = [];
    this.documentLengths = [];
    this.avgDocLength = 0;
    this.idf.clear();
  }
}

/**
 * LearningService provides semantic search, fact extraction, and learning capabilities.
 * Consolidates functionality from RecursiveLearningEngine and SemanticMemory.
 *
 * Features:
 * - BM25 semantic search for finding relevant facts
 * - Auto-fact extraction from conversations
 * - Usage tracking and confidence scoring
 * - Tool memory learning
 * - Workspace-aware
 */
export class LearningService {
  private bm25: SimpleBM25;
  private facts: MemoryFact[];
  private feedbacks: Map<string, MessageFeedback>;

  constructor() {
    this.bm25 = new SimpleBM25();
    this.facts = [];
    this.feedbacks = new Map();
  }

  /**
   * Initialize with existing facts
   */
  initialize(facts: MemoryFact[]): void {
    this.facts = facts;
    this.rebuildIndex();
  }

  /**
   * Rebuild BM25 index from current facts
   */
  rebuildIndex(): void {
    this.bm25.clear();
    this.facts.forEach(fact => {
      this.bm25.addDocument(fact.fact);
    });
  }

  /**
   * Find relevant facts using BM25 semantic search
   */
  findRelevantFacts(query: string, limit: number = 5): MemoryFact[] {
    if (this.facts.length === 0) return [];

    const searchResults = this.bm25.search(query);
    const relevantFacts: MemoryFact[] = [];

    for (const result of searchResults.slice(0, limit)) {
      const fact = this.facts[result.index];
      if (fact) {
        // Update usage count
        fact.usage_count = (fact.usage_count ?? 0) + 1;
        fact.last_seen = new Date().toISOString();
        relevantFacts.push(fact);
      }
    }

    return relevantFacts;
  }

  /**
   * Auto-extract facts from a conversation using pattern matching
   */
  extractFactsFromConversation(
    userMessage: Message,
    assistantMessage: Message,
    currentUser: User
  ): MemoryFact[] {
    const extractedFacts: MemoryFact[] = [];
    const now = new Date().toISOString();

    // Pattern 1: "remember that my X is Y"
    const rememberPattern = /remember that (?:my |the )?(.*?) is (.*?)(?:\.|$)/i;
    const rememberMatch = userMessage.content.match(rememberPattern);
    if (rememberMatch) {
      extractedFacts.push({
        id: createId(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name}'s ${rememberMatch[1]} is ${rememberMatch[2]}`,
        first_seen: now,
        last_seen: now,
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.9,
        auto_extracted: true,
      });
    }

    // Pattern 2: "I prefer X" or "I like X"
    const preferencePattern = /I (?:prefer|like|love|enjoy) (.*?)(?:\.|,|$)/i;
    const preferenceMatch = userMessage.content.match(preferencePattern);
    if (preferenceMatch) {
      extractedFacts.push({
        id: createId(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name} prefers ${preferenceMatch[1]}`,
        first_seen: now,
        last_seen: now,
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.8,
        auto_extracted: true,
      });
    }

    // Pattern 3: "My name is X" or "I am X"
    const namePattern = /(?:my name is|I am|I'm) ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/;
    const nameMatch = userMessage.content.match(namePattern);
    if (nameMatch) {
      extractedFacts.push({
        id: createId(),
        owner: currentUser.id,
        kind: 'profile',
        fact: `User's name is ${nameMatch[1]}`,
        first_seen: now,
        last_seen: now,
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.95,
        auto_extracted: true,
      });
    }

    // Pattern 4: "I work on X" or "I'm working on X"
    const projectPattern = /I(?:'m| am) working on (.*?)(?:\.|,|$)/i;
    const projectMatch = userMessage.content.match(projectPattern);
    if (projectMatch) {
      extractedFacts.push({
        id: createId(),
        owner: currentUser.id,
        kind: 'project',
        fact: `${currentUser.name} is working on ${projectMatch[1]}`,
        first_seen: now,
        last_seen: now,
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.7,
        auto_extracted: true,
      });
    }

    // Pattern 5: "Don't forget to X" or "Remember to X"
    const todoPattern = /(?:don't forget to|remember to|need to) (.*?)(?:\.|,|$)/i;
    const todoMatch = userMessage.content.match(todoPattern);
    if (todoMatch) {
      extractedFacts.push({
        id: createId(),
        owner: currentUser.id,
        kind: 'todo',
        fact: `TODO: ${todoMatch[1]}`,
        first_seen: now,
        last_seen: now,
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.8,
        auto_extracted: true,
      });
    }

    return extractedFacts;
  }

  /**
   * Add feedback for a message (used for learning)
   */
  addFeedback(messageId: string, feedback: MessageFeedback): void {
    this.feedbacks.set(messageId, feedback);
  }

  /**
   * Get all facts
   */
  getAllFacts(): MemoryFact[] {
    return this.facts;
  }

  /**
   * Add a fact and update the search index
   */
  addFact(fact: MemoryFact): void {
    const existingIndex = this.facts.findIndex(f => f.id === fact.id);
    if (existingIndex >= 0) {
      this.facts[existingIndex] = fact;
    } else {
      this.facts.push(fact);
    }
    this.rebuildIndex();
  }

  /**
   * Update a fact's confidence based on usage success
   */
  updateFactConfidence(factId: string, wasSuccessful: boolean): void {
    const fact = this.facts.find(f => f.id === factId);
    if (!fact) return;

    fact.usage_count = (fact.usage_count ?? 0) + 1;
    if (wasSuccessful) {
      fact.success_count = (fact.success_count ?? 0) + 1;
    }

    // Calculate confidence based on success rate
    if (fact.usage_count > 0) {
      fact.confidence = (fact.success_count ?? 0) / fact.usage_count;
    }
  }

  /**
   * Get learning statistics
   */
  getStats() {
    const totalFacts = this.facts.length;
    const autoExtractedFacts = this.facts.filter(f => f.auto_extracted).length;
    const avgConfidence = totalFacts > 0
      ? this.facts.reduce((sum, f) => sum + (f.confidence ?? 0), 0) / totalFacts
      : 0;

    return {
      totalFacts,
      autoExtractedFacts,
      avgConfidence,
      manualFacts: totalFacts - autoExtractedFacts,
    };
  }

  /**
   * Get cluster summary (group facts by kind)
   */
  getClusterSummary() {
    const clusters = new Map<string, MemoryFact[]>();

    this.facts.forEach(fact => {
      const kind = fact.kind || 'other';
      if (!clusters.has(kind)) {
        clusters.set(kind, []);
      }
      clusters.get(kind)!.push(fact);
    });

    return Array.from(clusters.entries()).map(([kind, facts]) => ({
      name: kind,
      count: facts.length,
      avgConfidence: facts.reduce((sum, f) => sum + (f.confidence ?? 0), 0) / facts.length,
    }));
  }
}

// Singleton instance
export const learningService = new LearningService();
