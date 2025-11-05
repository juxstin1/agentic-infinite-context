import React from 'react';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        {children}
    </svg>
);

export const TerminalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></IconWrapper>
);

export const ZapIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></IconWrapper>
);

export const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></IconWrapper>
);

export const WrenchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M21 11.5a4.5 4.5 0 0 1-6 4.24L9.75 21H7v-2.75l5.26-5.26A4.5 4.5 0 1 1 21 11.5z"></path>
        <line x1="11" y1="7" x2="13" y2="9"></line>
    </IconWrapper>
);
