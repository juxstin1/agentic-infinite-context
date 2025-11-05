import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { OutputLine, OutputLineType } from '../types';
import { SaveIcon } from './Icons';

interface OutputLineRendererProps {
    line: OutputLine;
    onSaveCode: (code: string) => void;
}

const markdownComponents = {
    h1: ({...props}) => <h1 className="text-xl font-bold text-lime-300 mt-4 mb-2" {...props} />,
    h2: ({...props}) => <h2 className="text-lg font-bold text-lime-300 mt-3 mb-1" {...props} />,
    h3: ({...props}) => <h3 className="text-md font-bold text-lime-300 mt-2" {...props} />,
    p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
    strong: ({...props}) => <strong className="font-bold text-lime-200" {...props} />,
    em: ({...props}) => <em className="italic" {...props} />,
    ul: ({...props}) => <ul className="list-disc list-inside pl-4 mb-2" {...props} />,
    ol: ({...props}) => <ol className="list-decimal list-inside pl-4 mb-2" {...props} />,
    li: ({...props}) => <li className="mb-1" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      return !inline ? (
        <pre className="bg-gray-950 p-3 rounded-md my-2 overflow-x-auto text-sm font-normal">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-lime-900/50 text-lime-300 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    a: ({...props}) => <a className="text-cyan-400 underline hover:text-cyan-300" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: ({...props}) => <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-2" {...props} />,
    table: ({...props}) => <table className="table-auto w-full my-2 border border-gray-600 border-collapse" {...props} />,
    thead: ({...props}) => <thead className="bg-gray-800" {...props} />,
    th: ({...props}) => <th className="border border-gray-600 px-2 py-1 text-left font-bold" {...props} />,
    td: ({...props}) => <td className="border border-gray-600 px-2 py-1" {...props} />,
    hr: ({...props}) => <hr className="border-gray-700 my-4" {...props} />,
};

export const OutputLineRenderer: React.FC<OutputLineRendererProps> = ({ line, onSaveCode }) => {
    const getLineClass = () => {
        switch (line.type) {
            case OutputLineType.Command: return 'text-white font-bold';
            case OutputLineType.Error: return 'text-red-400';
            case OutputLineType.Success: return 'text-lime-300';
            case OutputLineType.Info: return 'text-cyan-400';
            case OutputLineType.System: return 'text-yellow-400';
            case OutputLineType.Header: return 'text-lime-300 font-bold my-2';
            case OutputLineType.Separator: return 'text-gray-700 my-2 select-none';
            case OutputLineType.Ascii: return 'text-lime-500 text-xs sm:text-sm leading-tight whitespace-pre';
            case OutputLineType.AgentResponse: return 'text-white bg-gray-900/50 p-3 rounded-lg border-l-4 my-2';
            case OutputLineType.UserChatMessage: return 'my-1';
            case OutputLineType.ModelChatMessage: return 'my-1';
            case OutputLineType.Suggestion: return 'text-yellow-300 bg-yellow-900/30 border-l-4 border-yellow-500 px-3 py-2 my-2';
            default: return 'text-lime-400 whitespace-pre-wrap';
        }
    };

    const style = line.type === OutputLineType.AgentResponse ? { borderLeftColor: line.agent?.color } : {};

    const renderContent = () => {
        switch(line.type) {
            case OutputLineType.Separator:
                return '─'.repeat(80);
            case OutputLineType.AgentResponse:
                return (
                    <div>
                        <div className="text-xs mb-2 font-bold flex items-center gap-2" style={{ color: line.agent?.color }}>
                            <span>{line.agent?.icon}</span>
                            <span>{line.agent?.type.toUpperCase()} RESPONSE:</span>
                        </div>
                        <div className="text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {line.content}
                            </ReactMarkdown>
                        </div>
                        {line.actionableCode && (
                            <button
                                onClick={() => onSaveCode(line.actionableCode!)}
                                className="mt-3 inline-flex items-center gap-2 bg-lime-900/50 hover:bg-lime-800/50 text-lime-300 px-3 py-1 rounded-md text-xs transition-colors"
                            >
                                <SaveIcon className="w-3 h-3" />
                                Save to file
                            </button>
                        )}
                    </div>
                );
            case OutputLineType.UserChatMessage:
                return (
                    <div>
                        <span className="text-lime-300 font-bold mr-2">YOU:</span>
                        <span className="text-white whitespace-pre-wrap">{line.content}</span>
                    </div>
                );
            case OutputLineType.ModelChatMessage:
                const prefix = line.agent 
                    ? <span className="font-bold mr-2 flex-shrink-0 flex items-center gap-1" style={{color: line.agent.color}}>{line.agent.icon} {line.agent.type.toUpperCase()}:</span>
                    : <span className="text-cyan-400 font-bold mr-2 flex-shrink-0">ASSISTANT:</span>;
                
                 return (
                    <div className="flex items-start">
                        {prefix}
                        <div className="text-white min-w-0">
                           <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {line.content}
                           </ReactMarkdown>
                        </div>
                    </div>
                );
            case OutputLineType.Ascii:
                return <pre className="font-mono">{line.content}</pre>;
            case OutputLineType.Text:
                return <div className="whitespace-pre-wrap">{line.content}</div>;
             case OutputLineType.Suggestion:
                return <div className="whitespace-pre-wrap"><span className="font-bold">💡 SUGGESTION:</span> {line.content}</div>;
            default:
                return line.content;
        }
    };

    return (
        <div className={getLineClass()} style={style}>
            {renderContent()}
        </div>
    );
};