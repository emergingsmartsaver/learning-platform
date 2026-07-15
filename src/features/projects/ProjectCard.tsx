import { useEffect, useState } from 'react';
import { getProjectProgress, upsertProjectProgress } from '../../services/projects';
import { verifyGithubRepo } from '../../services/github';
import type { ProjectDef, ProjectStatus, ProjectVerification } from '../../types';

interface ProjectCardProps {
  project: ProjectDef;
  uid: string;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  completed: 'Completed',
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-800',
  submitted: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const ALL_STATUSES: ProjectStatus[] = ['not_started', 'in_progress', 'submitted', 'completed'];

export function ProjectCard({ project, uid }: ProjectCardProps) {
  const [status, setStatus] = useState<ProjectStatus>('not_started');
  const [githubLink, setGithubLink] = useState('');
  const [verification, setVerification] = useState<ProjectVerification | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectProgress(uid, project.id).then((p) => {
      if (!cancelled) {
        if (p) {
          setStatus(p.status);
          setGithubLink(p.githubLink ?? '');
          setVerification(p.verification ?? null);
        }
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid, project.id]);

  async function handleStatusChange(newStatus: ProjectStatus) {
    setStatusError(null);

    const needsLink = (newStatus === 'submitted' || newStatus === 'completed') && project.requiresGithubLink;
    if (needsLink && githubLink.trim() === '') {
      setStatusError('Add and save a GitHub link before marking this submitted or completed.');
      return;
    }
    if (newStatus === 'completed' && project.requiresGithubLink && !verification?.allPassed) {
      setStatusError('Run "Verify on GitHub" and pass all checks before marking this completed.');
      return;
    }

    setSaving(true);
    try {
      await upsertProjectProgress(uid, project.id, project.careerPathId, {
        status: newStatus,
        githubLink: githubLink.trim() || null,
      });
      setStatus(newStatus);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLink() {
    setSaving(true);
    try {
      await upsertProjectProgress(uid, project.id, project.careerPathId, {
        githubLink: githubLink.trim() || null,
      });
      setStatusError(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifyError(null);
    if (githubLink.trim() === '') {
      setVerifyError('Add and save a GitHub link first.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyGithubRepo(githubLink, project.requirements);
      setVerification(result);
      await upsertProjectProgress(uid, project.id, project.careerPathId, { verification: result });
    } catch {
      setVerifyError('Could not reach GitHub — check the link and try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <li className="rounded-md border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900">{project.title}</p>
        {!loading && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">{project.description}</p>

      {project.requirements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requirements</p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
            {project.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {project.rubric.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rubric</p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
            {project.rubric.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {project.requiresGithubLink && (
        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">GitHub link</label>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={githubLink}
              onChange={(e) => {
                setGithubLink(e.target.value);
                setVerification(null);
              }}
              placeholder="https://github.com/you/your-project"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleSaveLink}
              disabled={saving}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {verifying ? 'Checking GitHub…' : 'Verify on GitHub'}
          </button>
          {verifyError && <p className="mt-1 text-xs text-red-600">{verifyError}</p>}

          {verification && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <ul className="space-y-1">
                {verification.checks.map((check) => (
                  <li key={check.label} className="flex items-center gap-2 text-xs">
                    <span className={check.passed ? 'text-green-600' : 'text-red-600'}>
                      {check.passed ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-600">{check.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">
                Checked {new Date(verification.checkedAt).toLocaleString()}. This confirms the repo is real and
                roughly matches requirements — it doesn't grade code quality or correctness.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
          disabled={saving}
          className="mt-1 block rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {statusError && <p className="mt-1 text-xs text-red-600">{statusError}</p>}
      </div>
    </li>
  );
}
