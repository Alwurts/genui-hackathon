export type PRCategory =
  | 'security'
  | 'database'
  | 'backend'
  | 'frontend'
  | 'tests'
  | 'docs'
  | 'infra'
  | 'perf';

export interface DemoPR {
  id: number;
  repo: string;
  title: string;
  author: string;
  age: string;
  additions: number;
  deletions: number;
  files: number;
  status: 'open' | 'review' | 'draft';
  categories: PRCategory[];
  concerns: number;
  relevance: Record<string, number>; // lens name -> 0-100
}

export const LENSES = ['Backend', 'Security', 'Database', 'Frontend', 'QA', 'PM'] as const;
export type LensName = typeof LENSES[number];

export const DEMO_PRS: DemoPR[] = [
  {
    id: 2839,
    repo: 'api-gateway',
    title: 'Introduce idempotency keys on /charge endpoint',
    author: 'kai.m',
    age: '1d',
    additions: 312,
    deletions: 84,
    files: 11,
    status: 'review',
    categories: ['backend', 'tests', 'docs', 'perf'],
    concerns: 1,
    relevance: { Backend: 94, Security: 50, Database: 30, Frontend: 8, QA: 70, PM: 65 },
  },
  {
    id: 2841,
    repo: 'api-gateway',
    title: 'Refactor session token storage to comply with new policy',
    author: 'mariadb-jules',
    age: '2d',
    additions: 1284,
    deletions: 846,
    files: 28,
    status: 'review',
    categories: ['security', 'database', 'backend', 'tests'],
    concerns: 3,
    relevance: { Backend: 92, Security: 98, Database: 84, Frontend: 12, QA: 60, PM: 70 },
  },
  {
    id: 1198,
    repo: 'data-pipeline',
    title: 'Migrate events table to partitioned schema',
    author: 'sam.d',
    age: '1d',
    additions: 412,
    deletions: 96,
    files: 9,
    status: 'review',
    categories: ['database', 'backend', 'infra', 'perf'],
    concerns: 2,
    relevance: { Backend: 70, Security: 30, Database: 99, Frontend: 0, QA: 40, PM: 60 },
  },
  {
    id: 2845,
    repo: 'api-gateway',
    title: 'Bump fastify, fix CVE-2025-1124 in dependency tree',
    author: 'dependabot',
    age: '3h',
    additions: 28,
    deletions: 26,
    files: 3,
    status: 'open',
    categories: ['security', 'backend'],
    concerns: 1,
    relevance: { Backend: 60, Security: 95, Database: 5, Frontend: 5, QA: 30, PM: 40 },
  },
  {
    id: 4012,
    repo: 'web-app',
    title: 'New dashboard layout with collapsible PR cards',
    author: 'jerel.v',
    age: '5h',
    additions: 642,
    deletions: 188,
    files: 14,
    status: 'open',
    categories: ['frontend', 'tests', 'docs'],
    concerns: 1,
    relevance: { Backend: 18, Security: 8, Database: 4, Frontend: 96, QA: 78, PM: 55 },
  },
  {
    id: 1199,
    repo: 'data-pipeline',
    title: 'Update README with new ingest pipeline diagram',
    author: 'lina.p',
    age: '6h',
    additions: 88,
    deletions: 12,
    files: 1,
    status: 'draft',
    categories: ['docs'],
    concerns: 0,
    relevance: { Backend: 5, Security: 0, Database: 8, Frontend: 0, QA: 8, PM: 80 },
  },
  {
    id: 4015,
    repo: 'web-app',
    title: 'Fix focus trap regression in modal on Safari',
    author: 'priya.k',
    age: '8h',
    additions: 41,
    deletions: 22,
    files: 4,
    status: 'open',
    categories: ['frontend', 'tests'],
    concerns: 0,
    relevance: { Backend: 4, Security: 2, Database: 0, Frontend: 88, QA: 92, PM: 30 },
  },
];
