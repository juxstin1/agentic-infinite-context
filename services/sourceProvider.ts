// This file is a workaround for a web-based environment to allow the application
// to access its own source code for meta-analysis and self-reflection by agents.
// In a standard Node.js environment, this would be done with `fs.readFileSync`.

const source = {
    'App.tsx': `
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, AgentRole, FileSystem, OutputLine, OutputLineType, Skill, ChatMessage, AgentSkill } from './types';
import { AGENT_DEFINITIONS, ASCII_ART_BANNER, CHAT_SUMMARIZATION_INSTRUCTION, AGENT_SKILL_BUILDER_INSTRUCTION, AGENT_SKILL_REFINER_INSTRUCTION, AGENT_CHAT_SKILL_CREATOR_INSTRUCTION, META_AGENT_INSTRUCTION } from './constants';
import { callGeminiAPI } from './services/geminiService';
import { getSourceCode } from './services/sourceProvider';
import { TerminalIcon, ZapIcon } from './components/Icons';
import { OutputLineRenderer } from './components/OutputLineRenderer';

const CHAT_MEMORY_LIMIT = 20;
const COMPACTION_TRIGGER_THRESHOLD = 16;
const COMPACTION_KEEP_MESSAGES = 8;

type TerminalMode = 'command' | 'chat' | 'huddle';
type PendingSuggestion = { command: string, prompt: string };

export default function App() {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [filesystem, setFilesystem] = useState<FileSystem>({
    '/': {
      'readme.txt': 'Welcome to your agent workspace.\\nType "help" for commands.',
    },
    '/.skills/': {},
    '/.system/': {},
    '/app/src/': {},
    '/app/src/components/': {},
    '/app/src/services/': {},
  });
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);

  const [mode, setMode] = useState<TerminalMode>('command');
  const [huddleHistory, setHuddleHistory] = useState<ChatMessage[]>([]);
  const [huddleParticipants, setHuddleParticipants] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mountTime] = useState(Date.now());
  const commandsRef = useRef<any>({}); // Using ref to avoid stale closures in callbacks

  const addOutput = useCallback((lines: Omit<OutputLine, 'id'>[]) => {
    const linesWithIds: OutputLine[] = lines.map(line => ({
      ...line,
      id: \`line-\${Date.now()}-\${Math.random()}\`
    }));
    setOutput(prev => [...prev, ...linesWithIds]);
  }, []);

  const loadSkills = useCallback(async () => {
    const skillDir = filesystem['/.skills/'];
    if (!skillDir) return;
    
    const loadedSkills: AgentSkill[] = [];
    for (const filename of Object.keys(skillDir)) {
      try {
        const code = skillDir[filename];
        const skillName = filename.replace('.js', '');
        const skillFn = await Promise.resolve(eval(\`(\${code})\`));
        loadedSkills.push({ name: skillName, description: \`Agent-built skill: /\${skillName}\`, args: [], execute: skillFn });
      } catch (e) {
        console.error(\`Error loading skill \${filename}:\`, e);
        addOutput([{ type: OutputLineType.Error, content: \`Failed to load skill: \${filename}\` }]);
      }
    }
    setAgentSkills(loadedSkills);
    if (loadedSkills.length > 0) {
      addOutput([{ type: OutputLineType.System, content: \`Loaded \${loadedSkills.length} agent-built skill(s).\` }]);
    }
  }, [filesystem, addOutput]);

  const generateDocs = useCallback(() => {
    const allCommands = [
        ...Object.keys(commandsRef.current).map(name => ({ name, description: commandsRef.current[name].description })),
        ...agentSkills.map(s => ({ name: \`/\${s.name}\`, description: s.description }))
    ];

    let docsContent = '# Agentic Infinite Context Documentation\\n\\nThis is the auto-generated knowledge base for the orchestrator.\\n\\n';
    docsContent += '## Commands\\n\\n';
    allCommands.forEach(({ name, description }) => {
        docsContent += \`### \${name}\\n- **Description**: \${description}\\n\\n\`;
    });

    setFilesystem(prev => ({
        ...prev,
        '/.system/': { ...prev['/.system/'], 'docs.md': docsContent }
    }));
  }, [agentSkills]);

  useEffect(() => {
    const initializeSystem = async () => {
        // Load source code into VFS for self-reflection
        const sourceCode = getSourceCode();
        setFilesystem(prev => ({
            ...prev,
            '/app/src/': { ...prev['/app/src/'], ...sourceCode.root },
            '/app/src/components/': { ...prev['/app/src/components/'], ...sourceCode.components },
            '/app/src/services/': { ...prev['/app/src/services/'], ...sourceCode.services },
        }));
        
        // Load agent-built skills from VFS
        await loadSkills();

        // Initialize default chat skill
        const defaultSkill: Skill = { name: 'default', description: 'A helpful and friendly assistant.' };
        setSkills([defaultSkill]);
        setActiveSkill(defaultSkill);
    };

    initializeSystem();
  }, []); // Runs only once on mount
  
  useEffect(() => {
    generateDocs();
  }, [agentSkills, generateDocs]);
}
`,
    'types.ts': `
export enum AgentRole {
  Coder = 'coder',
  Analyst = 'analyst',
  Architect = 'architect',
  Creative = 'creative',
  Debug = 'debug',
}

export interface Agent {
  id: string;
  type: AgentRole;
  created: string;
  icon: string;
  color: string;
  desc: string;
}

export interface Skill {
  name: string;
  description: string;
}

// Represents a dynamically created, executable command built by an agent
export interface AgentSkill {
  name: string;
  description: string;
  args: { name: string, description: string }[];
  execute: (args: string[], context: any) => Promise<void>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export enum OutputLineType {
  Command = 'command',
  Error = 'error',
  Success = 'success',
  Info = 'info',
  System = 'system',
  Header = 'header',
  Separator = 'separator',
  Ascii = 'ascii',
  AgentResponse = 'agent',
  Text = 'text',
  UserChatMessage = 'user_chat',
  ModelChatMessage = 'model_chat',
  Suggestion = 'suggestion',
}

export interface OutputLine {
  id: string;
  type: OutputLineType;
  content: string;
  agent?: Agent;
  actionableCode?: string;
}

export interface FileSystem {
  [key:string]: {
    [key: string]: string;
  };
}
`,
    'constants.ts': `
import { AgentRole } from './types';

export const AGENT_DEFINITIONS: { [key in AgentRole]: { icon: string; color:string; desc: string; systemInstruction: string; } } = {
  [AgentRole.Coder]: {
    icon: '🤖',
    color: '#00ff00',
    desc: 'Code generation & debugging',
    systemInstruction: "You are a world-class senior software engineer specializing in code generation. Provide clean, efficient, and well-documented code. Always format code in markdown blocks with the correct language identifier. Provide brief, concise explanations.",
  },
  [AgentRole.Analyst]: {
    icon: '🔍',
    color: '#00d4ff',
    desc: 'Code review & analysis',
    systemInstruction: "You are a principal software engineer with a focus on code quality and analysis. Review code critically, identify potential bugs, security vulnerabilities, and performance bottlenecks. Suggest concrete improvements and best practices.",
  },
  [AgentRole.Architect]: {
    icon: '🏗️',
    color: '#ff9500',
    desc: 'System design & planning',
    systemInstruction: "You are a software architect with deep expertise in designing scalable and resilient systems. Focus on high-level architecture, design patterns, technology stacks, and data modeling. Provide clear diagrams and explanations for your proposals.",
  },
  [AgentRole.Creative]: {
    icon: '🎨',
    color: '#ff00ff',
    desc: 'Brainstorming & ideation',
    systemInstruction: "You are a creative technologist and product visionary. Generate innovative ideas, brainstorm unique solutions to problems, and explore unconventional approaches. Think outside the box.",
  },
  [AgentRole.Debug]: {
    icon: '🔧',
    color: '#ff4444',
    desc: 'Deep debugging assistance',
    systemInstruction: "You are a debugging expert. Given a problem description and code, systematically help identify the root cause of bugs. Ask clarifying questions and suggest step-by-step debugging strategies.",
  }
};

export const AGENT_CHAT_SKILL_CREATOR_INSTRUCTION = \`You are a system prompt-generating AI. Your task is to create a high-quality system instruction for a new chat assistant 'skill' based on a user's request.

**RAG (Retrieval-Augmented Generation) Rules:**
If the user's request implies the skill needs to know about the terminal's functionality (e.g., a 'tutor', 'helper', or 'docs' skill), you MUST embed one or both of the following tags in the system prompt you generate:
1.  **[USE_KNOWLEDGE_BASE:/system/docs.md]**: To give the skill access to the terminal's official documentation.
2.  **[ANALYZE_SOURCE:/app/src/]**: To give the skill the ability to read the terminal's own source code for deeper analysis.

**Output Requirements:**
- You MUST return ONLY the text of the system prompt.
- Do NOT include any explanatory text or wrappers.
- The prompt should be clear, concise, and define the persona and goal of the assistant.
\`;

export const META_AGENT_INSTRUCTION = \`You are a meta-cognitive agent. Your purpose is to analyze the source code of the terminal application you are running in. The user will ask questions about the application's architecture, code, and capabilities.

You will be provided with the relevant source code files as context. Your task is to:
1.  Carefully read and understand the provided source code.
2.  Answer the user's question based *only* on the information available in the code.
3.  Provide clear, concise, and accurate explanations.
4.  If the question involves code, provide relevant snippets in your answer.
5.  Do not guess or hallucinate about functionality that is not present in the code.\`;
`,
    'geminiService.ts': `
import { GoogleGenAI, Content } from "@google/genai";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const callGeminiAPI = async (
  prompt: string | Content[],
  systemInstruction: string
): Promise<string> => {
  if (!ai) {
    return "Error: API_KEY is not configured. Please set the API_KEY environment variable.";
  }

  const contents: Content[] = typeof prompt === 'string' 
    ? [{ role: 'user', parts: [{ text: prompt }] }] 
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return \`Error connecting to Gemini API: \${error.message}\`;
    }
    return "An unknown error occurred while contacting the Gemini API.";
  }
};
`,
    'OutputLineRenderer.tsx': `
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { OutputLine, OutputLineType } from '../types';
import { SaveIcon } from './Icons';

// Markdown component styling configuration
// ... (omitted for brevity, but would be included here) ...

export const OutputLineRenderer: React.FC<OutputLineRendererProps> = ({ line, onSaveCode }) => {
    // ... (omitted for brevity, but would be included here) ...
};
`,
};

export const getSourceCode = () => {
    return {
        root: {
            'App.tsx': source['App.tsx'],
            'types.ts': source['types.ts'],
            'constants.ts': source['constants.ts'],
        },
        components: {
            'OutputLineRenderer.tsx': source['OutputLineRenderer.tsx'],
        },
        services: {
            'geminiService.ts': source['geminiService.ts'],
        }
    };
};
