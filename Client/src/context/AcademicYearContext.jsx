import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { academicYearAPI } from '../services/api';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [activeYear, setActiveYear] = useState(null);   // full year object
  const [allYears, setAllYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    try {
      const res = await academicYearAPI.getAll();
      const years = res.data.academicYears || [];
      setAllYears(years);
      const active = years.find(y => y.isActive) || null;
      setActiveYear(active);
    } catch {
      // API not reachable yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  // Called after admin changes the active year in the Academic Years page
  const refreshYears = () => fetchYears();

  return (
    <AcademicYearContext.Provider value={{ activeYear, allYears, loading, refreshYears }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYear must be used inside AcademicYearProvider');
  return ctx;
};
