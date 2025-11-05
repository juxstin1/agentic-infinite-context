import { MemoryFact, Message, MessageFeedback, ToolMemory, User, PromptPerformance } from '../types';
import { SemanticMemory } from './semanticMemory';
import { ToolExecutionEngine } from './toolExecutor';
import crypto from 'crypto-js';

/**
 * RecursiveLearningEngine orchestrates semantic memory, tool learning,
 * and auto-fact extraction to create a self-improving AI system.
 * PHASE 4: Tracks prompt performance for auto-optimization
 */
export class RecursiveLearningEngine {
  private semanticMemory: SemanticMemory;
  private toolEngine: ToolExecutionEngine;
  private facts: MemoryFact[];
  private feedbacks: Map<string, MessageFeedback>;
  private promptPerformances: Map<string, PromptPerformance>;

  constructor() {
    this.semanticMemory = new SemanticMemory();
    this.toolEngine = new ToolExecutionEngine();
    this.facts = [];
    this.feedbacks = new Map();
    this.promptPerformances = new Map();
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

    // PHASE 1: Advanced Patterns

    // Pattern 6: Negative preferences "I hate/don't like X"
    const negativePattern = /I (?:hate|don't like|dislike|can't stand) (.*?)(?:\.|,|$)/i;
    const negativeMatch = userMessage.content.match(negativePattern);
    if (negativeMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name} dislikes ${negativeMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.85,
        auto_extracted: true,
      });
    }

    // Pattern 7: Rules "Always/Never do X"
    const alwaysPattern = /always (.*?)(?:\.|,|$)/i;
    const alwaysMatch = userMessage.content.match(alwaysPattern);
    if (alwaysMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'rule',
        fact: `${currentUser.name} always ${alwaysMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.9,
        auto_extracted: true,
      });
    }

    const neverPattern = /never (.*?)(?:\.|,|$)/i;
    const neverMatch = userMessage.content.match(neverPattern);
    if (neverMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'rule',
        fact: `${currentUser.name} never ${neverMatch[1]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.9,
        auto_extracted: true,
      });
    }

    // Pattern 8: Comparative learning "X is better than Y"
    const comparativePattern = /(.*?) is (?:better|worse|faster|slower|more|less) (?:than|compared to) (.*?)(?:\.|,|$)/i;
    const comparativeMatch = userMessage.content.match(comparativePattern);
    if (comparativeMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'preference',
        fact: `${currentUser.name} believes ${comparativeMatch[1]} is better than ${comparativeMatch[2]}`,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        source_message_id: userMessage.id,
        usage_count: 0,
        success_count: 0,
        confidence: 0.8,
        auto_extracted: true,
      });
    }

    // Pattern 9: Goals and aspirations "I want to X" or "My goal is X"
    const goalPattern = /(?:I want to|my goal is to|I'm trying to|I hope to) (.*?)(?:\.|,|$)/i;
    const goalMatch = userMessage.content.match(goalPattern);
    if (goalMatch) {
      extractedFacts.push({
        id: crypto.lib.WordArray.random(16).toString(),
        owner: currentUser.id,
        kind: 'todo',
        fact: `${currentUser.name} wants to ${goalMatch[1]}`,
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

  /**
   * PHASE 3: Cluster facts by semantic similarity
   * Groups related facts together for better organization
   */
  clusterFacts(): Map<string, MemoryFact[]> {
    const clusters = new Map<string, MemoryFact[]>();

    // Define cluster keywords for common topics
    const clusterDefinitions = [
      {
        name: 'Development Environment',
        keywords: ['editor', 'ide', 'vscode', 'vim', 'emacs', 'jetbrains', 'compiler', 'debugger']
      },
      {
        name: 'Programming Languages',
        keywords: ['python', 'javascript', 'typescript', 'java', 'rust', 'go', 'c++', 'ruby', 'php']
      },
      {
        name: 'Frameworks & Libraries',
        keywords: ['react', 'vue', 'angular', 'django', 'flask', 'express', 'nextjs', 'svelte']
      },
      {
        name: 'Preferences',
        keywords: ['prefer', 'like', 'love', 'dislike', 'hate', 'favorite', 'best']
      },
      {
        name: 'Projects',
        keywords: ['working on', 'building', 'developing', 'project', 'app', 'application']
      },
      {
        name: 'Goals & TODOs',
        keywords: ['want to', 'goal', 'trying to', 'hope to', 'plan to', 'todo', 'task']
      },
      {
        name: 'Rules & Habits',
        keywords: ['always', 'never', 'must', 'should', 'rule', 'habit']
      },
      {
        name: 'Personal Info',
        keywords: ['name is', 'age', 'location', 'from', 'live in', 'born']
      },
    ];

    // Initialize clusters
    clusterDefinitions.forEach(def => {
      clusters.set(def.name, []);
    });
    clusters.set('Other', []);

    // Assign facts to clusters
    this.facts.forEach(fact => {
      const factLower = fact.fact.toLowerCase();
      let assigned = false;

      for (const def of clusterDefinitions) {
        if (def.keywords.some(keyword => factLower.includes(keyword))) {
          clusters.get(def.name)?.push(fact);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        clusters.get('Other')?.push(fact);
      }
    });

    // Remove empty clusters
    Array.from(clusters.entries()).forEach(([name, facts]) => {
      if (facts.length === 0) {
        clusters.delete(name);
      }
    });

    return clusters;
  }

  /**
   * PHASE 3: Get facts from a specific cluster
   */
  getFactsFromCluster(clusterName: string): MemoryFact[] {
    const clusters = this.clusterFacts();
    return clusters.get(clusterName) || [];
  }

  /**
   * PHASE 3: Get cluster summary
   */
  getClusterSummary(): Array<{ name: string; count: number; avgConfidence: number }> {
    const clusters = this.clusterFacts();
    const summary: Array<{ name: string; count: number; avgConfidence: number }> = [];

    clusters.forEach((facts, name) => {
      const avgConfidence = facts.length > 0
        ? facts.reduce((sum, f) => sum + (f.confidence ?? 0.5), 0) / facts.length
        : 0;

      summary.push({
        name,
        count: facts.length,
        avgConfidence,
      });
    });

    return summary.sort((a, b) => b.count - a.count);
  }

  /**
   * PHASE 4: Track prompt performance
   */
  trackPromptPerformance(
    promptSnippet: string,
    modelId: string,
    contextType: string,
    success: boolean,
    responseQuality: number = 0.5
  ): void {
    const promptHash = crypto.SHA256(promptSnippet.slice(0, 100)).toString();

    const existing = this.promptPerformances.get(promptHash);

    if (existing) {
      existing.total_uses += 1;
      existing.success_count += success ? 1 : 0;
      existing.failure_count += success ? 0 : 1;
      existing.avg_response_quality =
        (existing.avg_response_quality * (existing.total_uses - 1) + responseQuality) /
        existing.total_uses;
      existing.last_used = new Date().toISOString();

      if (!existing.context_types.includes(contextType)) {
        existing.context_types.push(contextType);
      }
    } else {
      const newPerformance: PromptPerformance = {
        id: crypto.lib.WordArray.random(16).toString(),
        prompt_hash: promptHash,
        prompt_snippet: promptSnippet.slice(0, 200),
        model_id: modelId,
        success_count: success ? 1 : 0,
        failure_count: success ? 0 : 1,
        total_uses: 1,
        avg_response_quality: responseQuality,
        context_types: [contextType],
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      this.promptPerformances.set(promptHash, newPerformance);
    }
  }

  /**
   * PHASE 4: Get best performing prompts for a context
   */
  getBestPromptsForContext(contextType: string, limit: number = 5): PromptPerformance[] {
    const relevantPrompts = Array.from(this.promptPerformances.values())
      .filter(p => p.context_types.includes(contextType))
      .sort((a, b) => {
        const scoreA = (a.success_count / a.total_uses) * a.avg_response_quality;
        const scoreB = (b.success_count / b.total_uses) * b.avg_response_quality;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return relevantPrompts;
  }

  /**
   * PHASE 4: Get all prompt performances for analysis
   */
  getPromptPerformances(): PromptPerformance[] {
    return Array.from(this.promptPerformances.values());
  }

  /**
   * PHASE 4: Get prompt performance stats
   */
  getPromptStats(): {
    totalPrompts: number;
    avgSuccessRate: number;
    avgResponseQuality: number;
    bestPrompt?: PromptPerformance;
  } {
    const prompts = Array.from(this.promptPerformances.values());

    if (prompts.length === 0) {
      return {
        totalPrompts: 0,
        avgSuccessRate: 0,
        avgResponseQuality: 0,
      };
    }

    const totalUses = prompts.reduce((sum, p) => sum + p.total_uses, 0);
    const totalSuccesses = prompts.reduce((sum, p) => sum + p.success_count, 0);
    const avgSuccessRate = totalUses > 0 ? totalSuccesses / totalUses : 0;

    const avgResponseQuality =
      prompts.reduce((sum, p) => sum + p.avg_response_quality, 0) / prompts.length;

    const bestPrompt = prompts.sort((a, b) => {
      const scoreA = (a.success_count / a.total_uses) * a.avg_response_quality;
      const scoreB = (b.success_count / b.total_uses) * b.avg_response_quality;
      return scoreB - scoreA;
    })[0];

    return {
      totalPrompts: prompts.length,
      avgSuccessRate,
      avgResponseQuality,
      bestPrompt,
    };
  }
}
