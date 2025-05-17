'use client';

import React from 'react';
import Card from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card className="flex items-center">
      <div className={`flex-shrink-0 mr-4 p-3 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{value}</h3>
        <p className="text-sm text-secondary-500">{title}</p>
        <p className="text-xs text-secondary-400">{subtitle}</p>
      </div>
    </Card>
  );
};

export default StatCard; 