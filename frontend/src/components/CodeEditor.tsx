import React from 'react';
import Editor, { EditorProps } from '@monaco-editor/react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'json' | 'xml' | 'html' | 'javascript' | 'text';
  readOnly?: boolean;
  height?: string | number;
  placeholder?: string;
  minHeight?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '100%',
  placeholder = '',
  minHeight = 220,
}) => {
  const monacoLanguage =
    language === 'json'
      ? 'json'
      : language === 'xml'
      ? 'xml'
      : language === 'html'
      ? 'html'
      : language === 'javascript'
      ? 'javascript'
      : 'plaintext';

  const handleBeforeMount = (monaco: any) => {
    monaco.editor.defineTheme('mels-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '79c0ff', fontStyle: 'bold' },
        { token: 'string.value.json', foreground: 'a5d6ff' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: 'f97316' },
        { token: 'number.json', foreground: 'f97316' },
        { token: 'keyword.json', foreground: 'ff7b72' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'delimiter', foreground: 'e2e8f0' },
      ],
      colors: {
        'editor.background': '#0f121a',
        'editor.foreground': '#f1f5f9',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.selectionBackground': '#26334a',
        'editor.lineHighlightBackground': '#141a24',
        'editorCursor.foreground': '#20c997',
        'editorBracketMatch.background': '#1e293b',
        'editorBracketMatch.border': '#20c997',
      },
    });
  };

  return (
    <Box
      sx={{
        height: height,
        minHeight: minHeight,
        width: '100%',
        bgcolor: '#0f121a',
        borderRadius: '8px',
        overflow: 'hidden',
        border: 1,
        borderColor: '#1c2230',
        position: 'relative',
      }}
    >
      <Editor
        height={height}
        language={monacoLanguage}
        theme="mels-dark"
        beforeMount={handleBeforeMount}
        value={value}
        onChange={(val) => onChange && onChange(val || '')}
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          folding: true,
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
        }}
        loading={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
            <CircularProgress size={20} sx={{ color: '#20c997' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Loading Editor...</Typography>
          </Box>
        }
      />
    </Box>
  );
};
