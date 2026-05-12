import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface SATSLogoProps {
  size?: number;
  variant?: 'icon' | 'icon-with-text' | 'text-only';
  sx?: SxProps<Theme>;
  showText?: boolean;
}

export const SATSLogo: React.FC<SATSLogoProps> = ({
  size = 64,
  variant = 'icon',
  sx,
  showText = true,
}) => {
  const iconOnly = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Outer rounded rectangle border */}
      <rect x="20" y="20" width="160" height="160" rx="24" fill="none" stroke="url(#cyanGradient)" strokeWidth="8" />

      {/* Clipboard */}
      <g>
        {/* Clipboard clip */}
        <rect x="35" y="35" width="28" height="18" rx="4" fill="url(#blueCyanGradient)" />
        <circle cx="49" cy="39" r="3" fill="#001A4D" />

        {/* Clipboard body */}
        <rect x="35" y="50" width="65" height="95" rx="4" fill="none" stroke="url(#blueCyanGradient)" strokeWidth="5" />

        {/* Horizontal lines on clipboard */}
        <line x1="42" y1="65" x2="90" y2="65" stroke="url(#cyanAccent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="80" x2="90" y2="80" stroke="url(#cyanAccent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="95" x2="90" y2="95" stroke="url(#cyanAccent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="110" x2="90" y2="110" stroke="url(#cyanAccent)" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="125" x2="90" y2="125" stroke="url(#cyanAccent)" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* WiFi signal */}
      <g>
        {/* Inner arc */}
        <path
          d="M 130 85 Q 145 70 160 85"
          fill="none"
          stroke="url(#cyanGradient)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Middle arc */}
        <path
          d="M 125 75 Q 147.5 50 170 75"
          fill="none"
          stroke="url(#cyanGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>

      {/* Location pin */}
      <g>
        {/* Outer circle */}
        <circle cx="120" cy="130" r="22" fill="none" stroke="url(#blueCyanGradient)" strokeWidth="4" />
        {/* Inner circle */}
        <circle cx="120" cy="130" r="10" fill="url(#blueCyanGradient)" />
        {/* Pin point */}
        <path
          d="M 120 130 L 130 150 Q 120 160 110 150 Z"
          fill="url(#blueCyanGradient)"
          opacity="0.8"
        />
      </g>

      {/* Processor/circuit */}
      <g>
        {/* Central square */}
        <rect x="140" y="50" width="30" height="30" rx="4" fill="none" stroke="url(#cyanGradient)" strokeWidth="3" />
        {/* Small connection squares */}
        <rect x="130" y="60" width="8" height="8" rx="2" fill="url(#cyanAccent)" />
        <rect x="172" y="60" width="8" height="8" rx="2" fill="url(#cyanAccent)" />
        <rect x="130" y="72" width="8" height="8" rx="2" fill="url(#cyanAccent)" />
        <rect x="172" y="72" width="8" height="8" rx="2" fill="url(#cyanAccent)" />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="100%" stopColor="#00A8CC" />
        </linearGradient>

        <linearGradient id="blueCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#00D9FF" />
        </linearGradient>

        <linearGradient id="cyanAccent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="100%" stopColor="#00E5FF" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === 'text-only') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
        <Box
          sx={{
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px',
          }}
        >
          SATS
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: showText ? 1 : 0,
        ...sx,
      }}
    >
      {iconOnly}
      {(variant === 'icon-with-text' || showText) && (
        <Box
          sx={{
            fontSize: '0.875rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
            mt: 1,
          }}
        >
          SMART ASSET TRACKER
        </Box>
      )}
    </Box>
  );
};

export default SATSLogo;
