import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-getmeds-blue/15 text-getmeds-blue',
    green: 'bg-pharmacy-green/15 text-pharmacy-green',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-600',
  };

  const iconColorClass = colors[color] || colors.blue;

  return (
    <div className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`rounded-md p-3 ${iconColorClass}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-ink-secondary truncate">{title}</dt>
              <dd>
                <div className="text-lg font-bold text-ink-primary">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
