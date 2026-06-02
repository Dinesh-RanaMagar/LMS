import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, LineChart } from 'lucide-react';

// Simple Progress Bar Chart
export const ProgressChart = ({ data, title, color = 'indigo' }) => {
  const maxValue = Math.max(...data.map(item => item.value || 0));
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className={`text-${color}-600`} />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className={`font-bold text-${color}-700`}>{item.value}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div 
              className={`h-full rounded-full bg-${color}-500 transition-all duration-1000`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple Line Chart (using CSS)
export const SimpleLineChart = ({ data, title, color = 'emerald' }) => {
  const maxValue = Math.max(...data.map(item => item.value || 0));
  const minValue = Math.min(...data.map(item => item.value || 0));
  const range = maxValue - minValue || 1;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LineChart size={20} className={`text-${color}-600`} />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      
      <div className="relative h-32 bg-slate-50 rounded-2xl p-4">
        <div className="relative h-full flex items-end justify-between">
          {data.map((item, index) => {
            const height = ((item.value - minValue) / range) * 100;
            const trend = index > 0 ? item.value - data[index - 1].value : 0;
            
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className={`font-bold text-${color}-700`}>{item.value}%</span>
                  {trend > 0 && <TrendingUp size={12} className="text-emerald-500" />}
                  {trend < 0 && <TrendingDown size={12} className="text-rose-500" />}
                  {trend === 0 && <Minus size={12} className="text-slate-400" />}
                </div>
                <div 
                  className={`w-8 bg-${color}-500 rounded-t-lg transition-all duration-1000`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-slate-600 text-center leading-tight">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Radar Chart Simulation
export const RadarChart = ({ subjects, title }) => {
  const strongSubjects = subjects.filter(s => s.percentage >= 80);
  const weakSubjects = subjects.filter(s => s.percentage < 60);
  const averageSubjects = subjects.filter(s => s.percentage >= 60 && s.percentage < 80);
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      
      <div className="grid gap-4">
        {strongSubjects.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
            <h4 className="font-medium text-emerald-900 mb-2">Strong Performance (80%+)</h4>
            <div className="flex flex-wrap gap-2">
              {strongSubjects.map((subject, index) => (
                <span key={index} className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                  {subject.name}: {subject.percentage}%
                </span>
              ))}
            </div>
          </div>
        )}
        
        {averageSubjects.length > 0 && (
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Average Performance (60-79%)</h4>
            <div className="flex flex-wrap gap-2">
              {averageSubjects.map((subject, index) => (
                <span key={index} className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                  {subject.name}: {subject.percentage}%
                </span>
              ))}
            </div>
          </div>
        )}
        
        {weakSubjects.length > 0 && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
            <h4 className="font-medium text-rose-900 mb-2">Needs Improvement (&lt;60%)</h4>
            <div className="flex flex-wrap gap-2">
              {weakSubjects.map((subject, index) => (
                <span key={index} className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-800">
                  {subject.name}: {subject.percentage}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Pie Chart Simulation
export const PieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div 
                className={`h-4 w-4 rounded-full ${item.color || 'bg-slate-400'}`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-600">{item.value} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div 
                    className={`h-full rounded-full ${item.color || 'bg-slate-400'} transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default {
  ProgressChart,
  SimpleLineChart,
  RadarChart,
  PieChart
};