import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X } from 'lucide-react';
import { Athlete, Unit } from '../types';

interface Props {
  onImport: (athletes: Athlete[]) => void;
  unit?: Unit;
}

// Parse an entryHeight string to meters.
// Supports:
//   Imperial: "8-6"  "8'6""  "8' 6""  (feet-inches)
//   Metric:   "2.30"  "2.3"  (plain decimal = meters)
const parseEntryHeight = (raw: string, unit: Unit): number | undefined => {
  const val = raw.trim();
  if (!val) return undefined;

  // Detect feet-inches patterns: 8-6  or  8'6"  or  8' 6"
  const dashMatch = val.match(/^(\d+)-(\d+)$/);
  const quoteMatch = val.match(/^(\d+)'\s*(\d+)"?$/);
  const match = dashMatch || quoteMatch;

  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = parseInt(match[2], 10);
    return Number(((feet * 12 + inches) * 0.0254).toFixed(4));
  }

  // Plain number: treat as meters if metric, or feet-only if imperial and no decimal
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return undefined;

  // If we're in imperial mode and the number looks like feet (no dash/quote but whole number ≤ 20),
  // treat it as feet with 0 inches. Otherwise treat as meters.
  if (unit === 'imperial' && Number.isInteger(num) && num <= 20) {
    return Number((num * 12 * 0.0254).toFixed(4));
  }

  return num; // meters
};

export const CSVImporter: React.FC<Props> = ({ onImport, unit = 'metric' }) => {
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
        const athletes: Athlete[] = data.map((row, index) => {
          const rawEntry = String(
            row.entryHeight || row.entry_height || row['Entry Height'] || row['entry height'] || ''
          );
          const parsedEntry = parseEntryHeight(rawEntry, unit as Unit);
          return {
            id: crypto.randomUUID(),
            name: row.name || row.Name || `Athlete ${index + 1}`,
            school: row.school || row.School || row.team || row.Team || '',
            bibNumber: String(row.bib || row.Bib || row['bib #'] || row['Bib #'] || row.number || row.Number || ''),
            results: {},
            status: 'active',
            consecutiveMisses: 0,
            ...(parsedEntry ? { entryHeight: parsedEntry } : {}),
          };
        });

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

  const imperialExample = (
    <>
      bib,name,school,entryHeight<br />
      1,John Doe,Evergreen High,<br />
      2,Jane Smith,Westside Academy,8-6<br />
      3,Bob Lee,North Prep,10-0
    </>
  );

  const metricExample = (
    <>
      bib,name,school,entryHeight<br />
      1,John Doe,Evergreen High,<br />
      2,Jane Smith,Westside Academy,2.30<br />
      3,Bob Lee,North Prep,3.05
    </>
  );

  return (
    <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <Upload size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Import Athletes</h3>
          <p className="text-slate-500 text-sm mt-0.5">
            Upload a CSV with name, school, bib, and optional entryHeight columns
          </p>
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

        <div className="text-left w-full space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Example Format</p>
          <div className="bg-slate-100 p-3 rounded-lg font-mono text-xs text-slate-600">
            {unit === 'imperial' ? imperialExample : metricExample}
          </div>
          {unit === 'imperial' && (
            <p className="text-xs text-slate-400">
              Entry height accepts <span className="font-bold text-slate-600">feet-inches</span> format:{' '}
              <span className="font-mono font-bold text-slate-700">8-6</span> = 8′ 6″,{' '}
              <span className="font-mono font-bold text-slate-700">10-0</span> = 10′ 0″.
              Leave blank to start from opening height.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
