import { connect, Table } from '@lancedb/lancedb';
import { MemoryFact, Message } from '../types';

/**
 * LanceDB Vector Store for semantic search
 * Provides fast semantic similarity search over facts and messages
 */

interface VectorDocument {
  id: string;
  text: string;
  vector?: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export class VectorStore {
  private db: any = null;
  private factsTable: Table<VectorDocument> | null = null;
  private messagesTable: Table<VectorDocument> | null = null;
  private isInitialized = false;

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to LanceDB (in-memory for browser)
      this.db = await connect('memory://agentic');

      // Create tables if they don't exist
      await this.createTablesIfNeeded();

      this.isInitialized = true;
      console.log('✅ Vector store initialized');
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  private async createTablesIfNeeded(): Promise<void> {
    try {
      // Try to open existing tables
      this.factsTable = await this.db.openTable('facts');
      this.messagesTable = await this.db.openTable('messages');
    } catch {
      // Tables don't exist, create them
      const sampleFact: VectorDocument = {
        id: 'init',
        text: 'initialization document',
        metadata: {},
        created_at: new Date().toISOString(),
      };

      this.factsTable = await this.db.createTable('facts', [sampleFact]);
      this.messagesTable = await this.db.createTable('messages', [sampleFact]);

      // Delete initialization documents
      await this.factsTable.delete('id = "init"');
      await this.messagesTable.delete('id = "init"');
    }
  }

  /**
   * Add facts to the vector store
   */
  async addFacts(facts: MemoryFact[]): Promise<void> {
    if (!this.factsTable) await this.initialize();

    const documents: VectorDocument[] = facts.map(fact => ({
      id: fact.id,
      text: fact.fact,
      metadata: {
        kind: fact.kind,
        confidence: fact.confidence || 0.5,
        usage_count: fact.usage_count || 0,
        owner: fact.owner,
        auto_extracted: fact.auto_extracted || false,
      },
      created_at: fact.first_seen,
    }));

    try {
      await this.factsTable!.add(documents);
    } catch (error) {
      console.error('Failed to add facts to vector store:', error);
    }
  }

  /**
   * Search facts by semantic similarity
   */
  async searchFacts(query: string, limit: number = 10): Promise<MemoryFact[]> {
    if (!this.factsTable) await this.initialize();

    try {
      const results = await this.factsTable!
        .search(query)
        .limit(limit)
        .toArray();

      return results.map(doc => ({
        id: doc.id,
        fact: doc.text,
        kind: doc.metadata.kind,
        confidence: doc.metadata.confidence,
        usage_count: doc.metadata.usage_count,
        owner: doc.metadata.owner,
        auto_extracted: doc.metadata.auto_extracted,
        first_seen: doc.created_at,
        last_seen: doc.created_at,
      }));
    } catch (error) {
      console.error('Failed to search facts:', error);
      return [];
    }
  }

  /**
   * Add messages to the vector store
   */
  async addMessages(messages: Message[]): Promise<void> {
    if (!this.messagesTable) await this.initialize();

    const documents: VectorDocument[] = messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      metadata: {
        role: msg.role,
        senderId: msg.senderId,
        senderName: msg.senderName,
        chat_id: msg.chat_id,
        modelId: msg.modelId,
      },
      created_at: msg.created_at,
    }));

    try {
      await this.messagesTable!.add(documents);
    } catch (error) {
      console.error('Failed to add messages to vector store:', error);
    }
  }

  /**
   * Search messages by semantic similarity
   */
  async searchMessages(query: string, limit: number = 10, chatId?: string): Promise<Message[]> {
    if (!this.messagesTable) await this.initialize();

    try {
      let search = this.messagesTable!.search(query).limit(limit);

      if (chatId) {
        search = search.where(`metadata.chat_id = "${chatId}"`);
      }

      const results = await search.toArray();

      return results.map(doc => ({
        id: doc.id,
        content: doc.text,
        role: doc.metadata.role,
        senderId: doc.metadata.senderId,
        senderName: doc.metadata.senderName,
        chat_id: doc.metadata.chat_id,
        modelId: doc.metadata.modelId,
        created_at: doc.created_at,
      }));
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  }

  /**
   * Delete a fact from the vector store
   */
  async deleteFact(factId: string): Promise<void> {
    if (!this.factsTable) await this.initialize();

    try {
      await this.factsTable!.delete(`id = "${factId}"`);
    } catch (error) {
      console.error('Failed to delete fact:', error);
    }
  }

  /**
   * Update a fact in the vector store
   */
  async updateFact(fact: MemoryFact): Promise<void> {
    await this.deleteFact(fact.id);
    await this.addFacts([fact]);
  }

  /**
   * Clear all facts
   */
  async clearFacts(): Promise<void> {
    if (!this.factsTable) await this.initialize();

    try {
      await this.factsTable!.delete('id IS NOT NULL');
    } catch (error) {
      console.error('Failed to clear facts:', error);
    }
  }

  /**
   * Clear all messages
   */
  async clearMessages(chatId?: string): Promise<void> {
    if (!this.messagesTable) await this.initialize();

    try {
      if (chatId) {
        await this.messagesTable!.delete(`metadata.chat_id = "${chatId}"`);
      } else {
        await this.messagesTable!.delete('id IS NOT NULL');
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    factsCount: number;
    messagesCount: number;
  }> {
    if (!this.isInitialized) await this.initialize();

    try {
      const factsCount = await this.factsTable!.countRows();
      const messagesCount = await this.messagesTable!.countRows();

      return { factsCount, messagesCount };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { factsCount: 0, messagesCount: 0 };
    }
  }
}

// Singleton instance
export const vectorStore = new VectorStore();
