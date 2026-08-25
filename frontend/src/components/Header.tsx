import React from 'react';
import { Plus, X, Globe, Download, Upload, Zap } from 'lucide-react';
import { TabItem, Environment } from '../types';

interface HeaderProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  environments: Environment[];
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  onExport: () => void;
  onImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  environments,
  activeEnvId,
  onSelectEnv,
  onExport,
  onImport,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Zap size={14} />
        </div>
        <div className="brand-title">
          Mels
          <span className="brand-badge">መልስ</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map((tab) => {
          const method = tab.request.method;
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`req-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className={`method-badge ${method}`}>{method}</span>
              <span className="tab-title">{tab.title || tab.request.name || 'Untitled'}</span>
              {tabs.length > 1 && (
                <span
                  className="tab-close"
                  onClick={(e) => onCloseTab(tab.id, e)}
                  title="Close tab"
                >
                  <X size={12} />
                </span>
              )}
            </div>
          );
        })}
        <button className="new-tab-btn" onClick={onNewTab} title="New Request Tab">
          <Plus size={16} />
        </button>
      </div>

      {/* Right Action Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="icon-btn" onClick={onImport} title="Import Collection (JSON)">
          <Upload size={14} />
        </button>
        <button className="icon-btn" onClick={onExport} title="Export Collection (JSON)">
          <Download size={14} />
        </button>

        {/* Environment Selector */}
        <div className="env-selector">
          <Globe size={13} style={{ color: activeEnvId ? '#10b981' : '#64748b' }} />
          <select
            value={activeEnvId || ''}
            onChange={(e) => onSelectEnv(e.target.value ? e.target.value : null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              outline: 'none',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ background: '#181b26', color: '#94a3b8' }}>
              No Environment
            </option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} style={{ background: '#181b26', color: '#f1f5f9' }}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
