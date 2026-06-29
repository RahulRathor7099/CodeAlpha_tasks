import React, { useRef } from 'react';
import { Play, Square, Video, Cpu, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

export default function Dashboard({ 
  frame, 
  stats, 
  streaming, 
  source, 
  setSource, 
  onStart, 
  onStop, 
  uploading, 
  onVideoUpload 
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      onVideoUpload(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* KPI Stats cards */}
      <div className="kpi-row">
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span>TARGETS TRACKED</span>
            <div className="kpi-icon blue">
              <BarChart2 size={16} />
            </div>
          </div>
          <div className="kpi-value">
            {stats.active_objects_count ?? 0}
          </div>
          <div className="kpi-footer">
            Active objects inside frame
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span>FRAME PROCESSING FPS</span>
            <div className="kpi-icon emerald">
              <RefreshCw size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>
            {stats.fps ?? 0}
          </div>
          <div className="kpi-footer">
            Target benchmark: 30.0 FPS
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span>PIPELINE LATENCY</span>
            <div className="kpi-icon pink">
              <Cpu size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-accent)' }}>
            {stats.latency ?? 0} <span style={{ fontSize: '1rem' }}>ms</span>
          </div>
          <div className="kpi-footer">
            Inference + Track update lag
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span>CLASS CATEGORIES</span>
            <div className="kpi-icon purple">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-secondary)' }}>
            {Object.keys(stats.class_distribution ?? {}).length}
          </div>
          <div className="kpi-footer">
            Filtered target categories
          </div>
        </div>
      </div>

      {/* Main Video Stream Container */}
      <div className="video-canvas-container flex-1">
        {streaming && frame ? (
          <img 
            className="video-stream-img" 
            src={`data:image/jpeg;base64,${frame}`} 
            alt="Real-time Processed Video Stream" 
          />
        ) : (
          <div className="video-placeholder">
            <Video size={64} />
            <h4 style={{ color: 'var(--color-text-secondary)' }}>Stream Inactive</h4>
            <p style={{ fontSize: '0.85rem' }}>Select input source below and click "Start Session"</p>
          </div>
        )}
      </div>

      {/* Media Controller Bar */}
      <div className="glass-panel video-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ flex: 1, maxWidth: '240px' }}>
            <select 
              className="select-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={streaming}
            >
              <option value="road_sim">Highway Simulation (Procedural)</option>
              <option value="webcam">Device Webcam (Video I/O)</option>
            </select>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/*" 
            style={{ display: 'none' }} 
          />
          
          {/* We can hide standard file uploads or show simple triggers */}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {streaming ? (
            <button className="btn btn-secondary" onClick={onStop} style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
              <Square size={16} fill="var(--color-danger)" />
              Stop Session
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onStart}>
              <Play size={16} fill="#030712" />
              Start Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
