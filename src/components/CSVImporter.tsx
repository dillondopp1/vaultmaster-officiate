import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X } from 'lucide-react';
import { Athlete } from '../types';

interface Props {
  onImport: (athletes: Athlete[]) => void;
}

export const CSVImporter: React.FC<Props> = ({ onImport }) => {
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const athletes: Athlete[] = data.map((row, index) => ({
          id: crypto.randomUUID(),
          name: row.name || row.Name || `Athlete ${index + 1}`,
          school: row.school || row.School || row.team || row.Team || '',
          bibNumber: String(row.bib || row.Bib || row['bib #'] || row['Bib #'] || row.number || row.Number || ''),
          results: {},
          status: 'active',
          consecutiveMisses: 0,
        }));

        if (athletes.length === 0) {
          setError('No athletes found. Ensure there is a "name" column.');
          return;
        }

        onImport(athletes);
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      }
    });
  };

  return (
    <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <Upload size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Import Athletes</h3>
          <p className="text-slate-500 text-sm mt-0.5">Upload a CSV with name, school, and bib columns</p>
        </div>

        <label className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium cursor-pointer hover:bg-blue-700 transition-colors text-sm">
          Select CSV File
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 w-full">
            <X size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="text-left w-full">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Example Format</p>
          <div className="bg-slate-100 p-3 rounded-lg font-mono text-xs text-slate-600">
            bib,name,school<br />
            1,John Doe,Evergreen High<br />
            2,Jane Smith,Westside Academy
          </div>
        </div>
      </div>
    </div>
  );
};
