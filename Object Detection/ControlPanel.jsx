import React from 'react';
import { Sliders, Cpu, Activity, CheckSquare } from 'lucide-react';

export default function ControlPanel({ config, setConfig }) {
  const classesList = [
    { id: 'car', label: 'Car' },
    { id: 'person', label: 'Person' },
    { id: 'bicycle', label: 'Bicycle' },
    { id: 'truck', label: 'Truck' },
    { id: 'motorcycle', label: 'Motorbike' },
    { id: 'dog', label: 'Dog' },
    { id: 'cat', label: 'Cat' }
  ];

  const handleClassToggle = (classId) => {
    let updatedClasses = [...config.classes];
    if (updatedClasses.includes(classId)) {
      updatedClasses = updatedClasses.filter(c => c !== classId);
    } else {
      updatedClasses.push(classId);
    }
    setConfig({ ...config, classes: updatedClasses });
  };

  const handleToggle = (key) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  return (
    <div className="column-container">
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="section-title">
          <Cpu size={18} />
          Model Configuration
        </h3>

        <div className="control-group">
          <label className="control-label">
            Detection Model
          </label>
          <select 
            className="select-input" 
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
          >
            <option value="yolov5s">YOLOv5s (Small - Fast)</option>
            <option value="yolov5n">YOLOv5n (Nano - Ultra Fast)</option>
            <option value="yolov5m">YOLOv5m (Medium - Balanced)</option>
            <option value="faster_rcnn">Faster R-CNN (High Accuracy)</option>
            <option value="tflite">TensorFlow Lite (Edge Optimized)</option>
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">
            Tracking Algorithm
          </label>
          <select 
            className="select-input"
            value={config.tracker}
            onChange={(e) => setConfig({ ...config, tracker: e.target.value })}
          >
            <option value="sort">SORT (Kalman + Hungarian)</option>
            <option value="centroid">Centroid Tracker (Distance Match)</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="section-title">
          <Sliders size={18} />
          Detection Thresholds
        </h3>

        <div className="control-group">
          <div className="control-label">
            <span>Confidence Threshold</span>
            <span className="control-val">{config.confidence}</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="0.95" 
            step="0.05"
            className="slider-input" 
            value={config.confidence}
            onChange={(e) => setConfig({ ...config, confidence: parseFloat(e.target.value) })}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Trail Length (Frames)</span>
            <span className="control-val">{config.trailLength}</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="50" 
            step="5"
            className="slider-input" 
            value={config.trailLength}
            onChange={(e) => setConfig({ ...config, trailLength: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="section-title">
          <Activity size={18} />
          Visual Layers
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div 
            className={`checkbox-tile ${config.showBoxes ? 'checked' : ''}`}
            onClick={() => handleToggle('showBoxes')}
          >
            <input type="checkbox" checked={config.showBoxes} readOnly />
            <span>Show Bounding Boxes</span>
          </div>
          <div 
            className={`checkbox-tile ${config.showLabels ? 'checked' : ''}`}
            onClick={() => handleToggle('showLabels')}
          >
            <input type="checkbox" checked={config.showLabels} readOnly />
            <span>Show Labels & ID</span>
          </div>
          <div 
            className={`checkbox-tile ${config.showCentroids ? 'checked' : ''}`}
            onClick={() => handleToggle('showCentroids')}
          >
            <input type="checkbox" checked={config.showCentroids} readOnly />
            <span>Show Centroids</span>
          </div>
          <div 
            className={`checkbox-tile ${config.showTrails ? 'checked' : ''}`}
            onClick={() => handleToggle('showTrails')}
          >
            <input type="checkbox" checked={config.showTrails} readOnly />
            <span>Show Motion Trails</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 className="section-title">
          <CheckSquare size={18} />
          Target Filter Classes
        </h3>
        
        <div className="checkbox-grid">
          {classesList.map((cls) => (
            <div 
              key={cls.id}
              className={`checkbox-tile ${config.classes.includes(cls.id) ? 'checked' : ''}`}
              onClick={() => handleClassToggle(cls.id)}
            >
              <span>{cls.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
