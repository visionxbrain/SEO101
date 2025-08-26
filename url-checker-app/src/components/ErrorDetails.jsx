import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, X } from 'lucide-react';
import { getErrorExplanation, getErrorSummary } from '../utils/errorHelper';

function ErrorDetails({ error, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const explanation = getErrorExplanation(error);
  const summary = getErrorSummary(error);

  if (!error) return null;

  return (
    <div className="error-details">
      <div className="error-summary" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="error-summary-content">
          <AlertCircle size={16} className="error-icon" />
          <span className="error-summary-text">{summary}</span>
        </div>
        <button className="expand-btn">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && explanation && (
        <div className="error-expanded">
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          )}
          
          <div className="error-section">
            <h4 className="error-title">
              <AlertTriangle size={18} />
              {explanation.title}
            </h4>
          </div>

          <div className="error-section">
            <h5>สาเหตุที่เป็นไปได้:</h5>
            <ul className="error-list">
              {explanation.causes.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
          </div>

          <div className="error-section">
            <h5>
              <Lightbulb size={16} />
              วิธีแก้ไข:
            </h5>
            <ul className="solution-list">
              {explanation.solutions.map((solution, index) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </div>

          <div className="error-raw">
            <details>
              <summary>ดูข้อผิดพลาดแบบเต็ม</summary>
              <pre>{error}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

export default ErrorDetails;