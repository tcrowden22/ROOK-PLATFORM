import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { sigurd } from '../sdk';
import type { Problem } from '../lib/types';

interface Props {
  problemId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function ProblemDetail({ problemId, onNavigate }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProblem();
  }, [problemId]);

  const loadProblem = async () => {
    try {
      const data = await sigurd.problems.get(problemId);
      setProblem(data);
    } catch (error) {
      console.error('Failed to load problem:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!problem) return <div className="p-8">Problem not found</div>;

  return (
    <div className="p-8">
      <button
        onClick={() => onNavigate('problems')}
        className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Problems
      </button>
      <h1 className="text-2xl font-bold mb-4">{problem.title}</h1>
      <div className="glass-panel p-6">
        <p className="text-slate-300">{problem.description}</p>
        <div className="mt-4 flex gap-4">
          <span>Status: {problem.status}</span>
          <span>Priority: {problem.priority}</span>
        </div>
      </div>
    </div>
  );
}

