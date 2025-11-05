import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  RotateCcw,
  Copy,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

interface SystemPromptsEditorProps {
  className?: string;
}

const PROMPT_TEMPLATES = [
  {
    id: 'default',
    name: 'Default Assistant',
    description: 'Helpful, harmless, and honest AI assistant',
    prompt: `You are a helpful AI assistant. Be concise, accurate, and respectful. Focus on providing clear, actionable answers.`,
  },
  {
    id: 'code-expert',
    name: 'Code Expert',
    description: 'Specialized in software development',
    prompt: `You are an expert software engineer with deep knowledge of programming languages, frameworks, and best practices.

Focus on:
- Writing clean, efficient, well-documented code
- Following industry best practices
- Explaining complex concepts clearly
- Suggesting optimal solutions with trade-offs
- Security and performance considerations`,
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    description: 'Expert in data analysis and ML',
    prompt: `You are a data scientist specializing in statistical analysis, machine learning, and data visualization.

Focus on:
- Data preprocessing and cleaning
- Statistical modeling and hypothesis testing
- Machine learning model selection and evaluation
- Clear visualization recommendations
- Interpreting results for non-technical audiences`,
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Engaging storytelling and content',
    prompt: `You are a creative writer skilled in crafting engaging narratives, compelling copy, and polished content.

Focus on:
- Clear, vivid language
- Strong narrative structure
- Audience-appropriate tone
- Grammar and style excellence
- Creative problem-solving`,
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Thorough research and analysis',
    prompt: `You are a research assistant focused on thorough, evidence-based analysis.

Focus on:
- Comprehensive information gathering
- Critical evaluation of sources
- Presenting multiple perspectives
- Clear citations and references
- Identifying knowledge gaps`,
  },
  {
    id: 'tutor',
    name: 'Patient Tutor',
    description: 'Educational and supportive',
    prompt: `You are a patient tutor who excels at explaining complex topics in simple terms.

Focus on:
- Breaking down complex concepts
- Using analogies and examples
- Checking for understanding
- Encouraging questions
- Building on existing knowledge progressively`,
  },
];

const SystemPromptsEditor: React.FC<SystemPromptsEditorProps> = ({ className }) => {
  const { activeWorkspace, updateWorkspace } = useWorkspace();
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [charCount, setCharCount] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Load current workspace prompt
  useEffect(() => {
    if (activeWorkspace?.systemPrompt) {
      setPrompt(activeWorkspace.systemPrompt);
      setCharCount(activeWorkspace.systemPrompt.length);
    } else {
      setPrompt('');
      setCharCount(0);
    }
  }, [activeWorkspace]);

  const handleSave = async () => {
    if (!activeWorkspace) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await updateWorkspace(activeWorkspace.id, {
        systemPrompt: prompt.trim() || undefined,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save system prompt:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to workspace default? This cannot be undone.')) {
      setPrompt('');
      setCharCount(0);
      setSelectedTemplate(null);
    }
  };

  const handleApplyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    setCharCount(template.prompt.length);
    setSelectedTemplate(template.id);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    alert('Prompt copied to clipboard!');
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    setCharCount(value.length);
    setSaveStatus('idle');
  };

  const hasChanges =
    prompt.trim() !== (activeWorkspace?.systemPrompt || '').trim();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-400" />
          System Prompts
        </h2>
        <p className="text-neutral-400 text-sm">
          Customize the AI's behavior and personality for{' '}
          <span className="text-primary-400 font-medium">
            {activeWorkspace?.name || 'this workspace'}
          </span>
        </p>
      </div>

      {/* Current Workspace Info */}
      {activeWorkspace && (
        <Card variant="glass" padding="md">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Active Workspace
              </h3>
              <p className="text-lg font-bold text-primary-400 mt-1">
                {activeWorkspace.name}
              </p>
            </div>
            <Badge
              variant={activeWorkspace.systemPrompt ? 'primary' : 'secondary'}
              size="md"
              dot
            >
              {activeWorkspace.systemPrompt ? 'Custom Prompt' : 'Default'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Template Library */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Prompt Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROMPT_TEMPLATES.map(template => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                variant="glass"
                padding="md"
                interactive
                glow={selectedTemplate === template.id}
                onClick={() => handleApplyTemplate(template)}
                className={cn(
                  'cursor-pointer',
                  selectedTemplate === template.id &&
                    'border-primary-500/50 bg-primary-500/10'
                )}
              >
                <h4 className="text-sm font-semibold text-white mb-1">
                  {template.name}
                </h4>
                <p className="text-xs text-neutral-400">
                  {template.description}
                </p>
                {selectedTemplate === template.id && (
                  <div className="mt-2">
                    <Badge variant="primary" size="sm">
                      Active
                    </Badge>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Prompt Editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Custom Prompt
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs',
                charCount > 2000
                  ? 'text-error-light'
                  : charCount > 1500
                  ? 'text-warning-light'
                  : 'text-neutral-400'
              )}
            >
              {charCount} / 2000 characters
            </span>
            {charCount > 2000 && (
              <AlertCircle className="w-4 h-4 text-error-light" />
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={e => handlePromptChange(e.target.value)}
            placeholder="Enter your custom system prompt here... (optional)"
            className={cn(
              'w-full h-64 px-4 py-3 rounded-xl',
              'bg-white/5 backdrop-blur-xl border border-white/10',
              'text-white placeholder-neutral-500',
              'focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20',
              'outline-none transition-all duration-200',
              'resize-none font-mono text-sm',
              charCount > 2000 && 'border-error-500/50'
            )}
            maxLength={2500}
          />

          {/* Floating toolbar */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPrompt}
              disabled={!prompt.trim()}
              title="Copy prompt"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!prompt.trim()}
              title="Reset prompt"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tips */}
        <Card variant="glass" padding="sm" className="mt-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-400">
              <span className="font-semibold text-white">Tips:</span> Be
              specific about the AI's role, expertise, and communication style.
              Include any constraints or special instructions. System prompts
              apply to all messages in this workspace.
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {saveStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-success-light text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Saved successfully
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-error-light text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Failed to save
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || charCount > 2000}
            isLoading={isSaving}
          >
            <Save className="w-4 h-4" />
            Save Prompt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptsEditor;
