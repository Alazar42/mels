import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Box, Typography, IconButton, InputBase, Tooltip } from '@mui/material';
import { Search, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface VirtualizedViewerProps {
  content: string;
  isJSON?: boolean;
}

const LINE_HEIGHT = 20; // in px
const OVERSCAN = 20;    // buffer lines above and below

export const VirtualizedViewer: React.FC<VirtualizedViewerProps> = ({ content, isJSON }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!content) return [];
    return content.split('\n');
  }, [content]);

  const totalLines = lines.length;

  const searchMatches = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') return [];
    const q = searchQuery.toLowerCase();
    const matches: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        matches.push(i);
      }
    }
    return matches;
  }, [lines, searchQuery]);

  useEffect(() => {
    if (searchMatches.length > 0 && containerRef.current) {
      const lineIdx = searchMatches[searchIndex % searchMatches.length];
      const targetScroll = Math.max(0, lineIdx * LINE_HEIGHT - containerHeight / 2);
      containerRef.current.scrollTop = targetScroll;
    }
  }, [searchIndex, searchMatches, containerHeight]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalLines,
    Math.ceil((scrollTop + containerHeight) / LINE_HEIGHT) + OVERSCAN
  );

  const visibleLines = lines.slice(startIndex, endIndex);
  const topPadding = startIndex * LINE_HEIGHT;
  const bottomPadding = Math.max(0, (totalLines - endIndex) * LINE_HEIGHT);

  const renderLineContent = (line: string) => {
    if (!searchQuery) {
      if (!isJSON) return line;
      return highlightJSONLine(line);
    }

    const q = searchQuery.toLowerCase();
    const idx = line.toLowerCase().indexOf(q);
    if (idx === -1) {
      return isJSON ? highlightJSONLine(line) : line;
    }

    const before = line.substring(0, idx);
    const match = line.substring(idx, idx + searchQuery.length);
    const after = line.substring(idx + searchQuery.length);

    return (
      <>
        {isJSON ? highlightJSONLine(before) : before}
        <mark style={{ backgroundColor: '#eab308', color: '#000', borderRadius: '2px', padding: '0 2px' }}>
          {match}
        </mark>
        {isJSON ? highlightJSONLine(after) : after}
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      {/* Top Search / Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: '#11131c',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 1,
              py: 0.2,
            }}
          >
            <Search size={12} style={{ color: '#64748b', marginRight: 4 }} />
            <InputBase
              placeholder="Find in response..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchIndex(0);
              }}
              sx={{ fontSize: 11, fontFamily: 'monospace', width: 160 }}
            />
          </Box>

          {searchMatches.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
                {searchIndex + 1}/{searchMatches.length}
              </Typography>
              <IconButton size="small" onClick={() => setSearchIndex((prev) => (prev > 0 ? prev - 1 : searchMatches.length - 1))}>
                <ChevronUp size={12} />
              </IconButton>
              <IconButton size="small" onClick={() => setSearchIndex((prev) => (prev + 1) % searchMatches.length)}>
                <ChevronDown size={12} />
              </IconButton>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
            {totalLines.toLocaleString()} lines
          </Typography>
          <Tooltip title="Copy content">
            <IconButton size="small" onClick={handleCopy}>
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Virtual Line Area */}
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          bgcolor: 'background.default',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: `${LINE_HEIGHT}px`,
          position: 'relative',
        }}
      >
        <Box sx={{ height: `${topPadding}px` }} />

        {visibleLines.map((line, idx) => {
          const lineNumber = startIndex + idx + 1;
          const isMatchLine = searchMatches.includes(lineNumber - 1);

          return (
            <Box
              key={lineNumber}
              sx={{
                display: 'flex',
                height: `${LINE_HEIGHT}px`,
                bgcolor: isMatchLine ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                whiteSpace: 'pre',
              }}
            >
              {/* Line Gutter */}
              <Box
                sx={{
                  width: 55,
                  minWidth: 55,
                  textAlign: 'right',
                  pr: 1.5,
                  color: 'text.disabled',
                  userSelect: 'none',
                  borderRight: 1,
                  borderColor: 'divider',
                  bgcolor: 'rgba(15, 17, 23, 0.4)',
                }}
              >
                {lineNumber}
              </Box>

              {/* Line Content */}
              <Box sx={{ pl: 1.5, color: '#f8fafc', userSelect: 'text' }}>
                {renderLineContent(line)}
              </Box>
            </Box>
          );
        })}

        <Box sx={{ height: `${bottomPadding}px` }} />
      </Box>
    </Box>
  );
};

function highlightJSONLine(line: string) {
  const keyRegex = /"([^"]+)":/g;
  const stringRegex = /: "([^"]*)"/g;
  const numberRegex = /: (-?\d+\.?\d*)/g;
  const boolRegex = /: (true|false|null)/g;

  const highlighted = line
    .replace(keyRegex, '<span style="color: #93c5fd">"$1"</span>:')
    .replace(stringRegex, ': <span style="color: #86efac">"$1"</span>')
    .replace(numberRegex, ': <span style="color: #fca5a5">$1</span>')
    .replace(boolRegex, ': <span style="color: #c084fc">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
