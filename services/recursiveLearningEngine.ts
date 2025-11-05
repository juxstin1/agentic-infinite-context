import { MemoryFact, Message, MessageFeedback, ToolMemory, User } from '../types';
import { SemanticMemory } from './semanticMemory';
import { ToolExecutionEngine } from './toolExecutor';
import crypto from 'crypto-js';

/**
 * RecursiveLearningEngine orchestrates semantic memory, tool learning,
 * and auto-fact extraction to create a self-improving AI system.
 */
export class RecursiveLearningEngine {
  private semanticMemory: SemanticMemory;
  private toolEngine: ToolExecutionEngine;
  private facts: MemoryFact[];
  private feedbacks: Map<string, MessageFeedback>;

  constructor() {
    this.semanticMemory = new SemanticMemory();
    this.toolEngine = new ToolExecutionEngine();
    this.facts = [];
    this.feedbacks = new Map();
  }

  /**
   * Initialize with existing facts and tool memories
   */
  initialize(facts: MemoryFact[], toolMemories: ToolMemory[]): void {
    this.facts = facts;
    this.semanticMemory.indexFacts(facts);
    this.toolEngine.loadToolMemories(toolMemories);
  }

  /**
   * Find relevant facts using semantic search
   */
  findRelevantFacts(query: string, limit: number = 5): MemoryFact[] {
    const relevantFacts = this.semanticMemory.findRelevant(query, limit);

    // Update usage counts
    relevantFacts.forEach(fact => {
      const index = this.facts.findIndex(f => f.id === fact.id);
      if (index !== -1) {
        this.facts[index] = {
          ...this.facts[index],
          usage_count: (this.facts[index].usage_count ?? 0) + 1,
          last_seen: new Date().toISOString(),
        };
      }
    });

    return relevantFacts;
  }

  /**
   * Auto-extract facts from a conversation
   * This uses pattern matching and heuristics (could use LLM in future)
   */
  async extractFactsFromConversation(
    userMessage: Message,
    assistantMessage: Message,
    currentUser: User
  ): Promise<MemoryFact[]> {
    const extractedFacts: MemoryFact[] = [];
    const content = userMessage.content.toLowerCase();

    // Pattern 1: "remember that my X is Y"
    const rememberPattern = /remember that (?:my |the )?(.*?) is (.*?)(?:\.|$)/i;
    const rememberMatch = userMessage.content.match(rememberPattern);
    if (rememberMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name}'s ${rememberMatch[1]} is ${rememberMatch[2]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
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
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name} prefers ${preferenceMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.8,
        auto_extracted: true,
      });
    }

    // Pattern 3: "I'm working on X" or "I'm building X"
    const projectPattern = /I'?m (?:working on|building|developing|creating) (.*?)(?:\.|,|$)/i;
    const projectMatch = userMessage.content.match(projectPattern);
    if (projectMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'project',
        fact: `${currentUser.name} is working on ${projectMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.85,
        auto_extracted: true,
      });
    }

    // Pattern 4: "My name is X" or "I am X"
    const namePattern = /(?:my name is|I am|I'm) ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const nameMatch = userMessage.content.match(namePattern);
    if (nameMatch && nameMatch[1].toLowerCase() !== 'working' && nameMatch[1].toLowerCase() !== 'building') {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'profile',
        fact: `User's name is ${nameMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.95,
        auto_extracted: true,
      });
    }

    // Pattern 5: Technical stack mentions
    const techPattern = /(?:using|with|in) (React|TypeScript|Python|JavaScript|Node\.js|Vue|Angular|Django|Flask|FastAPI|Go|Rust|Java|C\+\+)/gi;
    const techMatches = userMessage.content.matchAll(techPattern);
    for (const match of techMatches) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'project',
        fact: `${currentUser.name} uses ${match[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.75,
        auto_extracted: true,
      });
    }

    return extractedFacts;
  }

  /**
   * Add a fact to memory
   */
  addFact(fact: MemoryFact): void {
    // Check for duplicates
    const existing = this.facts.find(f =>
      f.fact.toLowerCase() === fact.fact.toLowerCase()
    );

    if (existing) {
      // Update existing fact
      const index = this.facts.findIndex(f => f.id === existing.id);
      this.facts[index] = {
        ...existing,
        last_seen: new Date().toISOString(),
        usage_count: (existing.usage_count ?? 0) + 1,
        confidence: Math.min((existing.confidence ?? 0.5) + 0.05, 1.0),
      };
    } else {
      // Add new fact
      this.facts.push(fact);
    }

    // Reindex for semantic search
    this.semanticMemory.indexFacts(this.facts);
  }

  /**
   * Update fact after successful use
   */
  reinforceFact(factId: string): void {
    const index = this.facts.findIndex(f => f.id === factId);
    if (index !== -1) {
      this.facts[index] = {
        ...this.facts[index],
        success_count: (this.facts[index].success_count ?? 0) + 1,
        confidence: Math.min((this.facts[index].confidence ?? 0.5) + 0.1, 1.0),
        last_seen: new Date().toISOString(),
      };
    }
  }

  /**
   * Record user feedback on a message
   */
  recordFeedback(feedback: MessageFeedback): void {
    this.feedbacks.set(feedback.message_id, feedback);

    // If positive feedback, reinforce facts that were used
    if (feedback.thumbs_up) {
      // This could be enhanced to track which facts were used in the response
      // For now, we just record the feedback
    }
  }

  /**
   * Get tool execution engine
   */
  getToolEngine(): ToolExecutionEngine {
    return this.toolEngine;
  }

  /**
   * Get all facts (for persistence)
   */
  getFacts(): MemoryFact[] {
    return this.facts;
  }

  /**
   * Get all tool memories (for persistence)
   */
  getToolMemories(): ToolMemory[] {
    return this.toolEngine.getAllToolMemories();
  }

  /**
   * Get feedback for a message
   */
  getFeedback(messageId: string): MessageFeedback | undefined {
    return this.feedbacks.get(messageId);
  }

  /**
   * Get statistics about learning progress
   */
  getStats(): {
    totalFacts: number;
    autoExtractedFacts: number;
    avgConfidence: number;
    totalToolExecutions: number;
    toolSuccessRate: number;
  } {
    const autoExtracted = this.facts.filter(f => f.auto_extracted).length;
    const avgConfidence = this.facts.length > 0
      ? this.facts.reduce((sum, f) => sum + (f.confidence ?? 0.5), 0) / this.facts.length
      : 0;

    const toolMemories = this.toolEngine.getAllToolMemories();
    const totalToolExecutions = toolMemories.reduce((sum, m) => sum + m.total_executions, 0);
    const totalSuccesses = toolMemories.reduce((sum, m) => sum + m.success_count, 0);
    const toolSuccessRate = totalToolExecutions > 0 ? totalSuccesses / totalToolExecutions : 0;

    return {
      totalFacts: this.facts.length,
      autoExtractedFacts: autoExtracted,
      avgConfidence,
      totalToolExecutions,
      toolSuccessRate,
    };
  }

  /**
   * Prune low-quality facts (garbage collection)
   */
  pruneFacts(minConfidence: number = 0.2, minUsage: number = 0): void {
    const daysSinceLastSeen = (fact: MemoryFact) => {
      return (Date.now() - new Date(fact.last_seen).getTime()) / (1000 * 60 * 60 * 24);
    };

    this.facts = this.facts.filter(fact => {
      const confidence = fact.confidence ?? 0.5;
      const usage = fact.usage_count ?? 0;
      const daysOld = daysSinceLastSeen(fact);

      // Keep if high confidence
      if (confidence >= 0.8) return true;

      // Keep if recently used
      if (usage >= minUsage && daysOld < 30) return true;

      // Remove if low confidence and old
      if (confidence < minConfidence && daysOld > 7) return false;

      return true;
    });

    // Reindex after pruning
    this.semanticMemory.indexFacts(this.facts);
  }
}
