import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  Code,
  FileText,
  BarChart,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { skillFilesManager, SkillFile } from '../../services/skillFiles';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';

interface SkillsManagerProps {
  className?: string;
}

const SkillsManager: React.FC<SkillsManagerProps> = ({ className }) => {
  const [skills, setSkills] = useState<SkillFile[]>(skillFilesManager.getAllSkills());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillFile['category'] | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Refresh skills
  const refreshSkills = () => {
    setSkills(skillFilesManager.getAllSkills());
  };

  // Filter skills
  const filteredSkills = useMemo(() => {
    let filtered = skills;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        skill =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.keywords.some(kw => kw.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [skills, selectedCategory, searchQuery]);

  // Category icons
  const getCategoryIcon = (category: SkillFile['category']) => {
    switch (category) {
      case 'coding':
        return <Code className="w-4 h-4" />;
      case 'writing':
        return <FileText className="w-4 h-4" />;
      case 'analysis':
        return <BarChart className="w-4 h-4" />;
      case 'research':
        return <BookOpen className="w-4 h-4" />;
      case 'custom':
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: SkillFile['category']) => {
    switch (category) {
      case 'coding':
        return 'text-blue-400 bg-blue-500/10';
      case 'writing':
        return 'text-green-400 bg-green-500/10';
      case 'analysis':
        return 'text-purple-400 bg-purple-500/10';
      case 'research':
        return 'text-amber-400 bg-amber-500/10';
      case 'custom':
        return 'text-pink-400 bg-pink-500/10';
    }
  };

  // Handle skill actions
  const handleDuplicate = (skill: SkillFile) => {
    const duplicated = skillFilesManager.duplicateSkill(skill.id);
    refreshSkills();
    setSelectedSkill(duplicated);
  };

  const handleDelete = (skill: SkillFile) => {
    if (confirm(`Delete "${skill.name}"? This cannot be undone.`)) {
      skillFilesManager.deleteSkill(skill.id);
      refreshSkills();
      if (selectedSkill?.id === skill.id) {
        setSelectedSkill(null);
      }
    }
  };

  const handleExport = (skill: SkillFile) => {
    const json = skillFilesManager.exportSkill(skill.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name.toLowerCase().replace(/\s+/g, '-')}.skill.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const imported = skillFilesManager.importSkill(e.target.result);
            refreshSkills();
            setSelectedSkill(imported);
            alert(`Skill "${imported.name}" imported successfully!`);
          } catch (error) {
            alert('Failed to import skill. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const categories: Array<{ id: SkillFile['category'] | 'all'; label: string }> = [
    { id: 'all', label: 'All Skills' },
    { id: 'coding', label: 'Coding' },
    { id: 'writing', label: 'Writing' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'research', label: 'Research' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-400" />
            Skills Manager
          </h2>
          <p className="text-neutral-400 text-sm">
            Manage custom AI behaviors and specialized knowledge
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleImport}>
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
            <Plus className="w-4 h-4" />
            New Skill
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{skills.length}</div>
            <div className="text-xs text-neutral-400 mt-1">Total Skills</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {skills.filter(s => s.category === 'coding').length}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Coding</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {skills.filter(s => s.category === 'writing').length}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Writing</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {skills.filter(s => s.autoTrigger?.enabled).length}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Auto-Trigger</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSkills.map(skill => (
          <motion.div
            key={skill.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card
              variant="glass"
              padding="md"
              interactive
              glow={selectedSkill?.id === skill.id}
              onClick={() => setSelectedSkill(skill)}
              className={cn(
                'cursor-pointer',
                selectedSkill?.id === skill.id &&
                  'border-primary-500/50 bg-primary-500/5'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      getCategoryColor(skill.category)
                    )}
                  >
                    {getCategoryIcon(skill.category)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {skill.name}
                    </h3>
                    <p className="text-xs text-neutral-400 capitalize">
                      {skill.category}
                    </p>
                  </div>
                </div>
                {skill.autoTrigger?.enabled && (
                  <Badge variant="primary" size="sm" dot pulse>
                    Auto
                  </Badge>
                )}
              </div>

              <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                {skill.description}
              </p>

              {/* Keywords */}
              <div className="flex flex-wrap gap-1 mb-3">
                {skill.keywords.slice(0, 3).map(keyword => (
                  <Badge key={keyword} variant="secondary" size="sm">
                    {keyword}
                  </Badge>
                ))}
                {skill.keywords.length > 3 && (
                  <Badge variant="secondary" size="sm">
                    +{skill.keywords.length - 3}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleDuplicate(skill);
                  }}
                  title="Duplicate"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleExport(skill);
                  }}
                  title="Export"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedSkill(skill);
                    setIsEditing(true);
                  }}
                  title="Edit"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(skill);
                  }}
                  title="Delete"
                  className="text-error-light hover:text-error-DEFAULT"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSkills.length === 0 && (
        <Card variant="glass" padding="lg">
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              No skills found
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first skill to get started'}
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                <Plus className="w-4 h-4" />
                Create Skill
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Skill Detail Modal - Would implement this separately */}
      <AnimatePresence>
        {selectedSkill && !isEditing && (
          <SkillDetailModal
            skill={selectedSkill}
            onClose={() => setSelectedSkill(null)}
            onEdit={() => setIsEditing(true)}
            onDuplicate={() => handleDuplicate(selectedSkill)}
            onDelete={() => handleDelete(selectedSkill)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Skill Detail Modal Component
interface SkillDetailModalProps {
  skill: SkillFile;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 max-h-[80vh] overflow-y-auto"
      >
        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{skill.name}</h2>
              <p className="text-sm text-neutral-400">{skill.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Prompt</h3>
              <div className="bg-white/5 rounded-lg p-3 text-sm text-neutral-300 font-mono whitespace-pre-wrap">
                {skill.prompt}
              </div>
            </div>

            {skill.autoTrigger?.enabled && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  Auto-Trigger Patterns
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skill.autoTrigger.patterns.map(pattern => (
                    <Badge key={pattern} variant="primary" size="sm">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <Button variant="primary" onClick={onEdit}>
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button variant="ghost" onClick={onDuplicate}>
                <Copy className="w-4 h-4" />
                Duplicate
              </Button>
              <Button
                variant="ghost"
                onClick={onDelete}
                className="text-error-light hover:text-error-DEFAULT"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default SkillsManager;
