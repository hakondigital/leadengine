'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  Upload,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  File,
  Clock,
  Loader2,
} from 'lucide-react';

// ── Lead fields the API supports ──
const LEAD_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'company',
  'service_type', 'location', 'budget_range', 'urgency', 'message', 'postcode',
] as const;

// Fuzzy-match CSV headers to lead fields
function autoMapHeader(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const map: Record<string, string> = {
    firstname: 'first_name', first_name: 'first_name', first: 'first_name', givenname: 'first_name',
    lastname: 'last_name', last_name: 'last_name', last: 'last_name', surname: 'last_name', familyname: 'last_name',
    email: 'email', emailaddress: 'email', mail: 'email',
    phone: 'phone', phonenumber: 'phone', mobile: 'phone', cell: 'phone', telephone: 'phone', tel: 'phone',
    company: 'company', companyname: 'company', business: 'company', organisation: 'company', organization: 'company',
    servicetype: 'service_type', service: 'service_type', serviceneeded: 'service_type', request: 'service_type', enquiry: 'service_type',
    location: 'location', city: 'location', suburb: 'location', address: 'location', area: 'location',
    budgetrange: 'budget_range', budget: 'budget_range',
    urgency: 'urgency', priority: 'urgency', timeline: 'urgency',
    message: 'message', notes: 'message', details: 'message', description: 'message', comments: 'message',
    postcode: 'postcode', zip: 'postcode', zipcode: 'postcode',
  };
  return map[h] || '';
}

interface ColumnMapping {
  csvHeader: string;
  leadField: string;
  preview: string;
}

interface ImportHistoryRow {
  id: string;
  file_name: string;
  created_at: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  status: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)', label: 'Completed' },
  processing: { color: '#C48020', bg: 'rgba(240,160,48,0.08)', label: 'Processing' },
  failed: { color: '#C44E56', bg: 'rgba(232,99,108,0.08)', label: 'Failed' },
};

export default function ImportPage() {
  const { organization } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: showSuccess, error: showError } = useToast();

  // CSV state
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [showMapping, setShowMapping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Import history
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load import history
  const fetchHistory = useCallback(async () => {
    if (!organization?.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/import?organization_id=${organization.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      // Non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Parse a CSV file
  const handleFile = (file: globalThis.File) => {
    if (!file.name.endsWith('.csv')) {
      showError('Please upload a .csv file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('File too large — max 10MB');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);

      // Parse headers and first row for preview
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        showError('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const firstRow = parseCSVLine(lines[1]);
      const dataRows = lines.length - 1;

      const newMappings: ColumnMapping[] = headers.map((header, i) => ({
        csvHeader: header,
        leadField: autoMapHeader(header),
        preview: firstRow[i]?.trim().replace(/^"|"$/g, '') || '',
      }));

      setMappings(newMappings);
      setTotalRows(dataRows);
      setShowMapping(true);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const updateMapping = (index: number, newField: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, leadField: newField } : m))
    );
  };

  // Run the import
  const handleImport = async () => {
    if (!organization?.id || !csvText) return;

    // Validate at least email, first_name, last_name are mapped
    const mapped = new Set(mappings.map((m) => m.leadField));
    if (!mapped.has('first_name') || !mapped.has('last_name') || !mapped.has('email')) {
      showError('You must map first_name, last_name, and email columns');
      return;
    }

    setImporting(true);

    // Rebuild CSV with mapped headers so the API parser picks them up
    const lines = csvText.trim().split('\n');
    const mappedHeaders = mappings.map((m) => m.leadField || m.csvHeader);
    const rebuiltCSV = [mappedHeaders.join(','), ...lines.slice(1)].join('\n');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          csv_data: rebuiltCSV,
          file_name: fileName,
          skip_duplicates: skipDuplicates,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Import failed');
        return;
      }

      showSuccess(
        `Imported ${data.imported} of ${data.total} leads` +
          (data.duplicates > 0 ? ` (${data.duplicates} duplicates skipped)` : '') +
          (data.errors?.length > 0 ? ` — ${data.errors.length} rows had errors` : '')
      );

      // Reset and refresh history
      setShowMapping(false);
      setCsvText('');
      setFileName('');
      setMappings([]);
      fetchHistory();
    } catch {
      showError('Import failed — please try again');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = 'first_name,last_name,email,phone,company,service_type,location,budget_range,urgency,message,postcode';
    const example = 'Sarah,Mitchell,sarah@email.com,+61 412 345 678,Mitchell Corp,Kitchen Renovation,Sydney,$20k-$50k,high,Looking for a full kitchen reno,2000';
    const csv = `${headers}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odyssey_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/tools"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Tools
          </a>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[var(--od-accent)]" />
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
              CSV Import
            </h1>
          </div>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Import your existing leads from a spreadsheet — all details preserved
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Upload Area */}
        <Card>
          <CardContent className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[var(--od-radius-lg)] p-12 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)]'
                  : 'border-[var(--od-border-subtle)] hover:border-[var(--od-accent)]/50'
              }`}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] mx-auto mb-4">
                <Upload className="w-6 h-6 text-[var(--od-text-muted)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--od-text-primary)] mb-1">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-[var(--od-text-tertiary)] mb-4">
                or click to browse your files
              </p>
              <p className="text-xs text-[var(--od-text-muted)]">
                Supports .csv files up to 10MB
              </p>
            </div>

            <div className="flex items-center justify-center mt-4">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="w-3.5 h-3.5" />
                Download CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Column Mapping */}
        <AnimatePresence>
          {showMapping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-[var(--od-accent)]" />
                      <CardTitle>Column Mapping</CardTitle>
                      <Badge variant="accent" size="sm">{fileName}</Badge>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setShowMapping(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--od-border-subtle)]">
                          <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">CSV Column</th>
                          <th className="text-center text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 px-4" />
                          <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Maps To</th>
                          <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings.map((mapping, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-[var(--od-border-subtle)] last:border-0"
                          >
                            <td className="py-3 pr-4">
                              <span className="text-sm font-medium text-[var(--od-text-primary)] bg-[var(--od-bg-tertiary)] px-2 py-1 rounded-[var(--od-radius-sm)]">
                                {mapping.csvHeader}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <ArrowRight className="w-4 h-4 text-[var(--od-accent)] mx-auto" />
                            </td>
                            <td className="py-3 pr-4">
                              <select
                                value={mapping.leadField}
                                onChange={(e) => updateMapping(i, e.target.value)}
                                className="text-sm font-medium px-2 py-1.5 rounded-[var(--od-radius-sm)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30"
                              >
                                <option value="">— Skip —</option>
                                {LEAD_FIELDS.map((field) => (
                                  <option key={field} value={field}>
                                    {field}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3">
                              <span className="text-xs text-[var(--od-text-muted)] italic">{mapping.preview}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--od-border-subtle)]">
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-[var(--od-text-muted)]">{totalRows} rows detected</p>
                      <label className="flex items-center gap-2 text-xs text-[var(--od-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="rounded"
                        />
                        Skip duplicate emails
                      </label>
                    </div>
                    <Button size="sm" onClick={handleImport} disabled={importing}>
                      {importing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Import {totalRows} Leads
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--od-accent)]" />
              <CardTitle>Import History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--od-text-muted)]" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-[var(--od-text-muted)] text-center py-8">
                No imports yet. Upload a CSV to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--od-border-subtle)]">
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">File</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Date</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Rows</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Imported</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Skipped</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => {
                      const sc = statusConfig[row.status] || statusConfig.completed;
                      return (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[var(--od-border-subtle)] last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <File className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                              <span className="text-sm font-medium text-[var(--od-text-primary)]">{row.file_name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-[var(--od-text-tertiary)]">
                              {new Date(row.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm text-[var(--od-text-secondary)]">{row.total_rows}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-[#1F9B5A]">{row.imported_count}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm text-[var(--od-text-muted)]">{row.skipped_count}</span>
                          </td>
                          <td className="py-3">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: sc.color, backgroundColor: sc.bg }}
                            >
                              {row.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {row.status === 'failed' && <AlertTriangle className="w-2.5 h-2.5" />}
                              {sc.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple CSV line parser handling quoted fields
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { values.push(current); current = ''; }
    else { current += char; }
  }
  values.push(current);
  return values;
}
