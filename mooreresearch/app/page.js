'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_TEMPLATES = [
  {
    id: 'company_note',
    name: 'Company Note',
    template_key: 'company_note',
    description: 'Create a research note for a public company.',
  },
];

const TABLE_CANDIDATES = {
  templates: ['document_templates'],
  analysts: ['analysts', 'authors', 'analyst', 'analyst_list'],
  documents: ['documents', 'document', 'notes', 'research_notes'],
};

const ANALYST_LINK_TABLE_CANDIDATES = [
  'company_analysts',
  'company_analyst',
  'analyst_companies',
  'companies_analysts',
  'company_analyst_map',
  'company_author',
  'company_authors',
];

const COMPANY_ID_FIELD_CANDIDATES = ['company_id', 'companyId', 'company'];
const ANALYST_ID_FIELD_CANDIDATES = ['analyst_id', 'author_id', 'analystId', 'analyst'];

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

function getRecordLabel(record, keys) {
  for (const key of keys) {
    if (record?.[key]) return record[key];
  }
  return 'Unknown';
}

async function fetchTableCandidates(tableKeys, select = '*') {
  for (const table of tableKeys) {
    const { data, error } = await supabase.from(table).select(select).limit(50);
    if (error) {
      if (isMissingTableError(error)) {
        continue;
      }
      return { table, data: null, error };
    }
    return { table, data: data || [], error: null };
  }
  return { table: null, data: null, error: new Error(`No matching table found: ${tableKeys.join(', ')}`) };
}

function getTemplateKey(template) {
  return template?.template_key || template?.key || template?.id || String(template?.name || '').toLowerCase().replace(/\s+/g, '_');
}

function normalizeRpcRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.get_analysts_for_company)) return data.get_analysts_for_company;
  return [];
}

function uniqueById(rows) {
  const seen = new Set();
  const output = [];

  for (const row of rows || []) {
    const id = row?.id;
    if (id === undefined || id === null) {
      output.push(row);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(row);
  }

  return output;
}

async function queryFirstValidColumn(table, columns, value) {
  for (const column of columns) {
    const { data, error } = await supabase.from(table).select('*').eq(column, value).limit(200);
    if (error) {
      const missingColumn =
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.message?.toLowerCase().includes('column') ||
        error.message?.toLowerCase().includes('does not exist');

      if (missingColumn) continue;
      return { data: null, error, usedColumn: column };
    }
    return { data: data || [], error: null, usedColumn: column };
  }

  return { data: [], error: null, usedColumn: null };
}

async function fetchAnalystsWithFallback(company) {
  if (!company?.id) {
    return { rows: [], error: null, source: null };
  }

  const analystsTableResult = await fetchTableCandidates(TABLE_CANDIDATES.analysts);
  const analystsTable = analystsTableResult.table || null;

  if (analystsTableResult.error && !isMissingTableError(analystsTableResult.error)) {
    return { rows: [], error: analystsTableResult.error, source: null };
  }

  if (analystsTable) {
    const directMatch = await queryFirstValidColumn(analystsTable, COMPANY_ID_FIELD_CANDIDATES, company.id);
    if (directMatch.error) {
      return { rows: [], error: directMatch.error, source: `${analystsTable}.direct` };
    }
    if (directMatch.data.length > 0) {
      return { rows: uniqueById(directMatch.data), error: null, source: `${analystsTable}.${directMatch.usedColumn}` };
    }
  }

  for (const linkTable of ANALYST_LINK_TABLE_CANDIDATES) {
    const companyLinks = await queryFirstValidColumn(linkTable, COMPANY_ID_FIELD_CANDIDATES, company.id);

    if (companyLinks.error) {
      const missingTable = isMissingTableError(companyLinks.error);
      if (missingTable) continue;
      return { rows: [], error: companyLinks.error, source: linkTable };
    }

    if (!companyLinks.data.length) {
      continue;
    }

    const analystIds = [];
    for (const row of companyLinks.data) {
      for (const analystKey of ANALYST_ID_FIELD_CANDIDATES) {
        if (row?.[analystKey] !== undefined && row?.[analystKey] !== null) {
          analystIds.push(row[analystKey]);
          break;
        }
      }
    }

    const uniqueIds = [...new Set(analystIds.filter((id) => id !== undefined && id !== null))];
    if (!uniqueIds.length) {
      continue;
    }

    if (analystsTable) {
      const { data: linkedAnalysts, error: linkedError } = await supabase
        .from(analystsTable)
        .select('*')
        .in('id', uniqueIds)
        .limit(200);

      if (linkedError) {
        if (!isMissingTableError(linkedError)) {
          return { rows: [], error: linkedError, source: `${linkTable}->${analystsTable}` };
        }
      } else if (linkedAnalysts && linkedAnalysts.length > 0) {
        return { rows: uniqueById(linkedAnalysts), error: null, source: `${linkTable}.join` };
      }
    }

    const linkRowsWithAnalystInfo = companyLinks.data
      .map((row) => ({
        id: row.analyst_id ?? row.author_id ?? row.analystId ?? row.analyst ?? row.id,
        full_name: row.full_name ?? row.name ?? row.analyst_name ?? row.author_name ?? row.email ?? null,
        name: row.name ?? row.analyst_name ?? row.author_name ?? row.full_name ?? null,
        analyst_name: row.analyst_name ?? row.author_name ?? row.name ?? row.full_name ?? null,
        email: row.email ?? null,
      }))
      .filter((row) => row.id || row.full_name || row.name || row.analyst_name || row.email);

    if (linkRowsWithAnalystInfo.length > 0) {
      return { rows: uniqueById(linkRowsWithAnalystInfo), error: null, source: `${linkTable}.direct` };
    }
  }

  return { rows: [], error: null, source: null };
}

export default function LandingPage() {
  const router = useRouter();
  const [view, setView] = useState('landing');
  const [templates, setTemplates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedAnalysts, setSelectedAnalysts] = useState([]);
  const [companyTable, setCompanyTable] = useState(null);
  const [companyFetchError, setCompanyFetchError] = useState('');
  const [templateFetchError, setTemplateFetchError] = useState('');
  const [analystFetchError, setAnalystFetchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchDocuments();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setTemplateFetchError('');
    const result = await supabase.from('document_templates').select('*');
    if (result.error) {
      console.warn('Unable to load templates from database:', result.error.message);
      setTemplates(DEFAULT_TEMPLATES);
      setTemplateFetchError(result.error.message);
    } else if (Array.isArray(result.data) && result.data.length > 0) {
      setTemplates(result.data);
    } else {
      setTemplates([]);
      setTemplateFetchError('No document_templates rows found.');
    }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { table, data, error } = await fetchTableCandidates(TABLE_CANDIDATES.documents);
    if (error) {
      console.warn('Unable to load existing documents from database:', error.message);
      setDocuments([]);
      return;
    }

    try {
      const result = await supabase
        .from(table)
        .select('*')
        .eq('is_active_draft', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (result.error) {
        console.warn('Unable to load existing documents:', result.error.message);
        setDocuments([]);
      } else {
        setDocuments(result.data || []);
      }
    } catch (err) {
      console.warn('Unable to load existing documents:', err.message || err);
      setDocuments([]);
    }
  };

  const fetchCompanies = async () => {
    setCompanyFetchError('');
    const result = await supabase.from('companies').select('id,company_name');
    if (result.error) {
      console.warn('Unable to load companies from database:', result.error.message);
      setCompanies([]);
      setCompanyTable(null);
      setCompanyFetchError(result.error.message);
      return;
    }

    setCompanyTable('companies');
    setCompanies(result.data || []);
    if (!Array.isArray(result.data) || result.data.length === 0) {
      setCompanyFetchError('No rows returned from companies table.');
    }
  };

  const fetchAnalysts = async (company) => {
    setAnalysts([]); // Start with a clean slate
    setAnalystFetchError('');

    const companyId = company?.id;
    if (!companyId) {
      return;
    }

    // Try RPC first for the canonical path.
    const { data, error } = await supabase.rpc('get_analysts_for_company', {
      p_company_id: companyId
    });

    if (error) {
      console.warn('RPC Error fetching analysts. Falling back to schema-based lookup.', error);
    }

    const rpcRows = normalizeRpcRows(data);
    if (rpcRows.length > 0) {
      setAnalysts(uniqueById(rpcRows));
      return;
    }

    const fallback = await fetchAnalystsWithFallback(company);
    if (fallback.error) {
      console.error('Fallback analyst lookup failed:', fallback.error);
      setAnalystFetchError(`Error fetching analysts: ${fallback.error.message}`);
      return;
    }

    if (fallback.rows.length > 0) {
      setAnalysts(fallback.rows);
      return;
    }

    setAnalystFetchError('No analysts found for the selected company.');
  };

  const handleCreateFlow = async () => {
    setView('create');
    setSelectedTemplate(null);
    setSelectedCompany(null);
    setSelectedAnalysts([]);
    setCompanies([]);
    setAnalysts([]);
    setAnalystFetchError('');
  };

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setSelectedCompany(null);
    setSelectedAnalysts([]);
    setAnalysts([]);
    setAnalystFetchError('');
    await fetchCompanies();
  };

  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    setSelectedAnalysts([]);
    await fetchAnalysts(company);
  };

  const handleToggleAnalyst = (analyst) => {
    setSelectedAnalysts((prev) => {
      const exists = prev.some((selected) => selected.id === analyst.id);
      if (exists) {
        return prev.filter((selected) => selected.id !== analyst.id);
      }
      return [...prev, analyst];
    });
  };

  const handleCreateDocument = async () => {
    setError('');
    if (!selectedTemplate || !selectedCompany) {
      setError('Please select a template and a company.');
      return;
    }

    setLoading(true);

    try {
      const templateKey = getTemplateKey(selectedTemplate);
      const insertPayload = {
        template_key: templateKey,
        company_id: selectedCompany.id,
        author_id: selectedAnalysts[0]?.id || null,
        title: `Draft for ${selectedCompany.company_name || 'Selected Company'}`,
        content_json: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Start writing your research note...' }],
            },
          ],
        },
      };

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      router.push(`/Editor/${insertData.id}`);

    } catch (createError) {
      setError(createError.message || 'Failed to create document.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async (docId) => {
    router.push(`/Editor/${docId}`);
  };

  const selectedTemplateHasCompanies = useMemo(() => {
    if (!selectedTemplate) return false;
    const key = getTemplateKey(selectedTemplate);
    return key === 'company_note' || key === 'company-note';
  }, [selectedTemplate]);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const labelA = getRecordLabel(a, ['display_name', 'name', 'template_name', 'id']).toLowerCase();
      const labelB = getRecordLabel(b, ['display_name', 'name', 'template_name', 'id']).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [templates]);

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const labelA = getRecordLabel(a, ['company_name', 'name', 'title', 'id']).toLowerCase();
      const labelB = getRecordLabel(b, ['company_name', 'name', 'title', 'id']).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [companies]);

  const sortedAnalysts = useMemo(() => {
    return [...analysts].sort((a, b) => {
      const labelA = getRecordLabel(a, ['full_name', 'name', 'analyst_name', 'email', 'id']).toLowerCase();
      const labelB = getRecordLabel(b, ['full_name', 'name', 'analyst_name', 'email', 'id']).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [analysts]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Moore Research</h1>
          <p className="mt-3 text-slate-600">Create a new research note or open an existing document.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCreateFlow}
              className="rounded-2xl border border-slate-200 bg-slate-900 px-6 py-4 text-left text-white shadow-sm transition hover:bg-slate-800"
            >
              <p className="text-lg font-semibold">Create a new document</p>
              <p className="mt-2 text-sm text-slate-300">Pick a template, select a company, then choose an analyst to continue.</p>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Open existing document</p>
                  <p className="mt-2 text-sm text-slate-600">Open a recently edited research note.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleOpenDocument(doc.id)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300"
                    >
                      <div>{getRecordLabel(doc, ['title', 'name', 'document_name', 'id'])}</div>
                      {doc.updated_at ? <div className="text-xs text-slate-500">Updated {new Date(doc.updated_at).toLocaleDateString()}</div> : null}
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No existing documents found.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {view === 'create' ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Create a new document</h2>
                <p className="mt-2 text-sm text-slate-600">Select the template and company you want, then choose an analyst to start.</p>
              </div>
              <button
                type="button"
                onClick={() => setView('landing')}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">1. Templates</h3>
                <p className="mt-2 text-sm text-slate-600">Choose a template from the database.</p>
                <div className="mt-4 space-y-3">
                  {loading && templates.length === 0 ? (
                    <div className="text-sm text-slate-500">Loading templates…</div>
                  ) : templates.length > 0 ? (
                    sortedTemplates.map((template) => {
                      const label = getRecordLabel(template, ['display_name', 'name', 'template_name', 'id']);
                      const isSelected = selectedTemplate?.id === template.id;
                      return (
                        <button
                          key={template.id || label}
                          type="button"
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300'}`}
                        >
                          <div>{label}</div>
                          {template.description ? <div className="mt-1 text-xs text-slate-500">{template.description}</div> : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      No templates found in document_templates.
                      {templateFetchError ? <div className="mt-2 text-sm text-red-600">{templateFetchError}</div> : null}
                    </div>
                  )}
                </div>
              </section>

              {selectedTemplate ? (
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">2. Companies</h3>
                  <p className="mt-2 text-sm text-slate-600">Select the company for this note.</p>
                  <div className="mt-4 space-y-3">
                    {companies.length > 0 ? (
                      sortedCompanies.map((company) => {
                        const label = getRecordLabel(company, ['company_name', 'name', 'title', 'id']);
                        const isSelected = selectedCompany?.id === company.id;
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleSelectCompany(company)}
                            className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300'}`}
                          >
                            {label}
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No companies found in the database.</div>
                    )}
                  </div>
                  {companyTable && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      Using table: <span className="font-semibold">{companyTable}</span>
                    </div>
                  )}
                  {companyFetchError ? (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {companyFetchError}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {selectedCompany ? (
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">3. Analysts</h3>
                  <p className="mt-2 text-sm text-slate-600">Pick an analyst if available, then create the document.</p>
                  <div className="mt-4 space-y-3">
                    {analysts.length > 0 ? (
                      sortedAnalysts.map((analyst) => {
                        const label = getRecordLabel(analyst, ['full_name', 'name', 'analyst_name', 'email', 'id']);
                        const isSelected = selectedAnalysts.some((selected) => selected.id === analyst.id);
                        return (
                          <button
                            key={analyst.id}
                            type="button"
                            onClick={() => handleToggleAnalyst(analyst)}
                            className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300'}`}
                          >
                            {label}
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No analysts found for the selected company.</div>
                    )}
                  </div>
                  {analystFetchError ? (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {analystFetchError}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">Ready to create?</p>
                  <p className="mt-1 text-sm text-slate-300">Your new document will open in the editor when created.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateDocument}
                  disabled={loading || !selectedTemplate || !selectedCompany}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Document'}
                </button>
              </div>
              {selectedTemplate ? <p className="mt-3 text-sm text-slate-300">Template: {getRecordLabel(selectedTemplate, ['display_name', 'name', 'id'])}</p> : null}
              {selectedCompany ? <p className="mt-1 text-sm text-slate-300">Company: {getRecordLabel(selectedCompany, ['company_name', 'name', 'id'])}</p> : null}
              {selectedAnalysts.length > 0 ? (
                <p className="mt-1 text-sm text-slate-300">
                  Analysts: {selectedAnalysts.map((analyst) => getRecordLabel(analyst, ['full_name', 'name', 'analyst_name', 'email', 'id'])).join(', ')}
                </p>
              ) : null}
              {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
