import { ArrowRight, ExternalLink } from 'lucide-react';

function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  status = 'active', 
  onClick,
  documentation,
  badge,
  children
}) {
  return (
    <div className={`feature-card ${status}`}>
      {badge && (
        <span className={`card-badge ${badge.toLowerCase()}`}>
          {badge}
        </span>
      )}
      
      <div className="card-header">
        <h3 className="card-title">
          {Icon && <Icon size={24} className="card-title-icon" />}
          {title}
          {documentation && (
            <a href={documentation} className="doc-link" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} />
              Documentation
            </a>
          )}
        </h3>
      </div>

      <div className="card-body">
        <p className="card-description">{description}</p>
        
        {children}
        
        {status === 'active' && onClick && (
          <button className="card-action" onClick={onClick}>
            Start building
            <ArrowRight size={16} />
          </button>
        )}
        
        {status === 'coming-soon' && (
          <div className="card-coming-soon">
            <span>Coming Soon</span>
          </div>
        )}
      </div>

      {Icon && (
        <div className="card-icon">
          <Icon size={120} strokeWidth={1} color="var(--cf-gray-3)" />
        </div>
      )}
    </div>
  );
}

export default FeatureCard;