import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getCompletenessColor } from '../utils/completeness';

interface CompletenessIndicatorProps {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const CompletenessIndicator: React.FC<CompletenessIndicatorProps> = ({
  percentage,
  completedFields,
  totalFields,
  missingFields,
  size = 'md',
  showDetails = false
}) => {
  const colors = getCompletenessColor(percentage);
  
  const sizeClasses = {
    sm: {
      text: 'text-xs',
      height: 'h-1.5',
      padding: 'px-2 py-1'
    },
    md: {
      text: 'text-sm',
      height: 'h-2',
      padding: 'px-3 py-1.5'
    },
    lg: {
      text: 'text-base',
      height: 'h-3',
      padding: 'px-4 py-2'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${classes.height}`}>
          <div
            className={`${colors.bar} ${classes.height} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`${classes.text} font-semibold ${colors.text} whitespace-nowrap`}>
          {percentage}%
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-1">
          <p className={`${classes.text} text-[#5C5C5C]`}>
            {completedFields} of {totalFields} required fields completed
          </p>
          
          {missingFields.length > 0 && (
            <div className={`${colors.bg} border ${colors.border} rounded-lg ${classes.padding}`}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className={`${classes.text} font-medium ${colors.text}`}>
                    Missing Fields:
                  </p>
                  <ul className={`${classes.text} ${colors.text} mt-1 space-y-0.5`}>
                    {missingFields.map((field, index) => (
                      <li key={index}>• {field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompletenessIndicator;
