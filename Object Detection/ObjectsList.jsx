import React from 'react';
import { Eye, ShieldAlert } from 'lucide-react';

export default function ObjectsList({ trackedObjects = [] }) {
  
  const getBadgeClass = (className) => {
    switch (className?.toLowerCase()) {
      case 'car': return 'badge-car';
      case 'person': return 'badge-person';
      case 'bicycle': return 'badge-bicycle';
      case 'truck': return 'badge-truck';
      default: return 'badge-other';
    }
  };

  return (
    <div className="glass-panel objects-list-container" style={{ padding: '20px' }}>
      <h3 className="section-title" style={{ marginBottom: '12px' }}>
        <Eye size={18} />
        Live Objects Registry
      </h3>
      
      {trackedObjects.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flex: 1,
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
          gap: '8px'
        }}>
          <ShieldAlert size={24} />
          <span>No objects actively tracked</span>
        </div>
      ) : (
        <div className="objects-list">
          {trackedObjects.map((obj) => (
            <div key={obj.id} className="object-item">
              <div className="object-meta">
                <span className={`object-badge ${getBadgeClass(obj.class)}`}>
                  {obj.class}
                </span>
                <span className="object-id">
                  #{obj.id}
                </span>
              </div>
              
              <div className="object-stats">
                <div>Conf: {Math.round(obj.confidence * 100)}%</div>
                <div>Velocity: <span className="object-velocity">{obj.velocity} px/f</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
