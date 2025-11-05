/**
 * Skill Files System
 * Custom agent behaviors and specialized knowledge
 */

export interface SkillFile {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'writing' | 'analysis' | 'research' | 'custom';
  prompt: string;
  examples?: Array<{
    input: string;
    output: string;
  }>;
  keywords: string[];
  autoTrigger?: {
    enabled: boolean;
    patterns: string[];
  };
  created_at: string;
  updated_at: string;
}

export class SkillFilesManager {
  private skills: Map<string, SkillFile> = new Map();
  private STORAGE_KEY = 'agentic-skill-files';

  constructor() {
    this.loadFromStorage();
    this.loadBuiltinSkills();
  }

  /**
   * Load skills from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const skills: SkillFile[] = JSON.parse(stored);
        skills.forEach(skill => this.skills.set(skill.id, skill));
      } catch (error) {
        console.error('Failed to load skills from storage:', error);
      }
    }
  }

  /**
   * Save skills to localStorage
   */
  private saveToStorage(): void {
    const skills = Array.from(this.skills.values());
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(skills));
  }

  /**
   * Load built-in skills
   */
  private loadBuiltinSkills(): void {
    const builtinSkills: SkillFile[] = [
      {
        id: 'code-reviewer',
        name: 'Code Reviewer',
        description: 'Review code for bugs, performance, and best practices',
        category: 'coding',
        prompt: `You are an expert code reviewer. Analyze the provided code and provide:
1. Potential bugs and security issues
2. Performance optimization opportunities
3. Code quality and readability improvements
4. Best practices violations
5. Specific, actionable recommendations

Format your response as:
## Issues Found
- [Priority] Issue description

## Recommendations
- Recommendation with code example

Be concise but thorough.`,
        examples: [
          {
            input: 'function add(a, b) { return a + b }',
            output: '## Issues Found\n- [Low] Missing type annotations\n\n## Recommendations\n- Add TypeScript types: `function add(a: number, b: number): number`',
          },
        ],
        keywords: ['code', 'review', 'bug', 'fix', 'refactor'],
        autoTrigger: {
          enabled: true,
          patterns: ['/review', 'review this code', 'find bugs'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'technical-writer',
        name: 'Technical Writer',
        description: 'Write clear technical documentation',
        category: 'writing',
        prompt: `You are a technical documentation specialist. Create clear, concise documentation that:
1. Explains complex concepts simply
2. Includes practical examples
3. Follows documentation best practices
4. Uses consistent formatting
5. Anticipates reader questions

Structure:
# Title
Brief overview

## Prerequisites
What readers need to know

## Main Content
Step-by-step explanations with examples

## Troubleshooting
Common issues and solutions`,
        keywords: ['documentation', 'docs', 'guide', 'tutorial', 'explain'],
        autoTrigger: {
          enabled: true,
          patterns: ['/document', 'write docs', 'create guide'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        description: 'Analyze data and provide insights',
        category: 'analysis',
        prompt: `You are a data analyst. Analyze the provided data and:
1. Identify key patterns and trends
2. Calculate relevant statistics
3. Draw meaningful insights
4. Suggest actionable recommendations
5. Visualize data (describe charts/graphs)

Format:
## Summary
High-level findings

## Detailed Analysis
Deep dive into patterns

## Insights
Key takeaways

## Recommendations
Data-driven suggestions`,
        keywords: ['data', 'analyze', 'statistics', 'insights', 'trends'],
        autoTrigger: {
          enabled: true,
          patterns: ['/analyze', 'analyze this', 'find patterns'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'research-assistant',
        name: 'Research Assistant',
        description: 'Conduct thorough research on topics',
        category: 'research',
        prompt: `You are a research assistant. Conduct comprehensive research:
1. Break down the topic into key areas
2. Provide factual, well-sourced information
3. Present multiple perspectives
4. Identify knowledge gaps
5. Suggest further reading

Structure:
## Overview
Topic introduction

## Key Findings
Main research results

## Different Perspectives
Various viewpoints

## Gaps & Questions
Areas needing more research

## Resources
Suggested further reading`,
        keywords: ['research', 'investigate', 'learn', 'study', 'explore'],
        autoTrigger: {
          enabled: true,
          patterns: ['/research', 'research this', 'tell me about'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    builtinSkills.forEach(skill => {
      if (!this.skills.has(skill.id)) {
        this.skills.set(skill.id, skill);
      }
    });
  }

  /**
   * Create a new skill
   */
  createSkill(data: Omit<SkillFile, 'id' | 'created_at' | 'updated_at'>): SkillFile {
    const skill: SkillFile = {
      ...data,
      id: `skill-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.skills.set(skill.id, skill);
    this.saveToStorage();

    return skill;
  }

  /**
   * Update an existing skill
   */
  updateSkill(id: string, updates: Partial<SkillFile>): SkillFile {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill ${id} not found`);

    const updated: SkillFile = {
      ...skill,
      ...updates,
      id: skill.id, // Prevent ID change
      updated_at: new Date().toISOString(),
    };

    this.skills.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete a skill
   */
  deleteSkill(id: string): void {
    this.skills.delete(id);
    this.saveToStorage();
  }

  /**
   * Get a skill by ID
   */
  getSkill(id: string): SkillFile | undefined {
    return this.skills.get(id);
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillFile[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillFile['category']): SkillFile[] {
    return this.getAllSkills().filter(skill => skill.category === category);
  }

  /**
   * Find skills that match a query or pattern
   */
  findMatchingSkills(input: string): SkillFile[] {
    const lowerInput = input.toLowerCase();

    return this.getAllSkills().filter(skill => {
      // Check auto-trigger patterns
      if (skill.autoTrigger?.enabled) {
        const matchesPattern = skill.autoTrigger.patterns.some(pattern =>
          lowerInput.includes(pattern.toLowerCase())
        );
        if (matchesPattern) return true;
      }

      // Check keywords
      const matchesKeyword = skill.keywords.some(keyword =>
        lowerInput.includes(keyword.toLowerCase())
      );

      return matchesKeyword;
    });
  }

  /**
   * Apply a skill to generate a system prompt
   */
  applySkill(skillId: string, basePrompt?: string): string {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill ${skillId} not found`);

    let combinedPrompt = skill.prompt;

    if (basePrompt) {
      combinedPrompt = `${basePrompt}\n\n## Specialized Skill: ${skill.name}\n${skill.prompt}`;
    }

    return combinedPrompt;
  }

  /**
   * Duplicate a skill
   */
  duplicateSkill(id: string): SkillFile {
    const original = this.skills.get(id);
    if (!original) throw new Error(`Skill ${id} not found`);

    return this.createSkill({
      ...original,
      name: `${original.name} (Copy)`,
    });
  }

  /**
   * Export skill to JSON
   */
  exportSkill(id: string): string {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill ${id} not found`);

    return JSON.stringify(skill, null, 2);
  }

  /**
   * Import skill from JSON
   */
  importSkill(json: string): SkillFile {
    const data = JSON.parse(json);
    return this.createSkill(data);
  }
}

export const skillFilesManager = new SkillFilesManager();
