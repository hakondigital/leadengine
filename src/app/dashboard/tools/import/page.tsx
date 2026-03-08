'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface ColumnMapping {
  csvColumn: string;
  leadField: string;
  preview: string;
}

interface ImportHistory {
  id: string;
  fileName: string;
  date: string;
  totalRows: number;
  imported: number;
  skipped: number;
  status: 'completed' | 'partial' | 'failed';
}

const mockMappings: ColumnMapping[] = [
  { csvColumn: 'Full Name', leadField: 'name', preview: 'Sarah Mitchell' },
  { csvColumn: 'Email Address', leadField: 'email', preview: 'sarah@email.com' },
  { csvColumn: 'Phone', leadField: 'phone', preview: '+61 412 345 678' },
  { csvColumn: 'Company', leadField: 'company', preview: 'Mitchell Corp' },
  { csvColumn: 'Service Needed', leadField: 'service_type', preview: 'Kitchen Renovation' },
  { csvColumn: 'Lead Source', leadField: 'source', preview: 'referral' },
];

const mockHistory: ImportHistory[] = [
  { id: '1', fileName: 'leads_march_2026.csv', date: '2026-03-05', totalRows: 150, imported: 142, skipped: 8, status: 'completed' },
  { id: '2', fileName: 'old_crm_export.csv', date: '2026-02-20', totalRows: 430, imported: 415, skipped: 15, status: 'completed' },
  { id: '3', fileName: 'facebook_leads.csv', date: '2026-02-10', totalRows: 88, imported: 80, skipped: 8, status: 'partial' },
  { id: '4', fileName: 'broken_file.csv', date: '2026-01-15', totalRows: 0, imported: 0, skipped: 0, status: 'failed' },
];

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)', label: 'Completed' },
  partial: { color: '#C48020', bg: 'rgba(240,160,48,0.08)', label: 'Partial' },
  failed: { color: '#C44E56', bg: 'rgba(232,99,108,0.08)', label: 'Failed' },
};

export default function ImportPage() {
  const { organization } = useOrganization();
  const [showMapping, setShowMapping] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/tools"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Tools
          </a>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[var(--le-accent)]" />
                <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                  CSV Import
                </h1>
              </div>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                Import leads from spreadsheets with smart column mapping
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Upload Area */}
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setShowMapping(true); }}
              className={`border-2 border-dashed rounded-[var(--le-radius-lg)] p-12 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-[var(--le-accent)] bg-[var(--le-accent-muted)]'
                  : 'border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/50'
              }`}
              onClick={() => setShowMapping(true)}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--le-bg-tertiary)] border border-[var(--le-border-subtle)] mx-auto mb-4">
                <Upload className="w-6 h-6 text-[var(--le-text-muted)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--le-text-primary)] mb-1">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-[var(--le-text-tertiary)] mb-4">
                or click to browse your files
              </p>
              <p className="text-xs text-[var(--le-text-muted)]">
                Supports .csv and .xlsx files up to 10MB
              </p>
            </div>

            <div className="flex items-center justify-center mt-4">
              <Button variant="ghost" size="sm">
                <Download className="w-3.5 h-3.5" />
                Download CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Column Mapping Preview */}
        {showMapping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[var(--le-accent)]" />
                    <CardTitle>Column Mapping</CardTitle>
                    <Badge variant="accent" size="sm">leads_march_2026.csv</Badge>
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
                      <tr className="border-b border-[var(--le-border-subtle)]">
                        <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">CSV Column</th>
                        <th className="text-center text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 px-4" />
                        <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Lead Field</th>
                        <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMappings.map((mapping, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-[var(--le-border-subtle)] last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-[var(--le-text-primary)] bg-[var(--le-bg-tertiary)] px-2 py-1 rounded-[var(--le-radius-sm)]">
                              {mapping.csvColumn}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <ArrowRight className="w-4 h-4 text-[var(--le-accent)] mx-auto" />
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-[var(--le-accent)] bg-[var(--le-accent-muted)] px-2 py-1 rounded-[var(--le-radius-sm)]">
                              {mapping.leadField}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-[var(--le-text-muted)] italic">{mapping.preview}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--le-border-subtle)]">
                  <p className="text-xs text-[var(--le-text-muted)]">150 rows detected</p>
                  <Button size="sm">
                    <Upload className="w-3.5 h-3.5" />
                    Import Leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Import History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--le-accent)]" />
              <CardTitle>Import History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--le-border-subtle)]">
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">File</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Date</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Rows</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Imported</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Skipped</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHistory.map((row, i) => {
                    const sc = statusConfig[row.status];
                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-[var(--le-border-subtle)] last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <File className="w-3.5 h-3.5 text-[var(--le-text-muted)]" />
                            <span className="text-sm font-medium text-[var(--le-text-primary)]">{row.fileName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs text-[var(--le-text-tertiary)]">{row.date}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-[var(--le-text-secondary)]">{row.totalRows}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-medium text-[#1F9B5A]">{row.imported}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-[var(--le-text-muted)]">{row.skipped}</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
