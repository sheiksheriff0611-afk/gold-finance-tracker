import React from 'react';

const StatCard = ({ title, value, subValue, icon: Icon, color = 'gold', trend }) => {
  const colorStyles = {
    gold: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/5',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/5',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/5',
    },
  };

  const current = colorStyles[color] || colorStyles.gold;

  return (
    <div className={`p-4 rounded-xl bg-[#0b1329] border ${current.border} shadow-lg ${current.glow} flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-amber-500/60`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-xl font-bold text-white mt-1.5 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${current.bg} border ${current.border}`}>
          <Icon className={`w-5 h-5 ${current.text}`} />
        </div>
      </div>

      {(subValue || trend) && (
        <div className="mt-3 pt-2.5 border-t border-[#1a2c5b]/60 flex items-center justify-between text-[11px]">
          {subValue && <span className="text-slate-400">{subValue}</span>}
          {trend && (
            <span className="text-amber-400 font-medium ml-auto flex items-center gap-0.5">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;

