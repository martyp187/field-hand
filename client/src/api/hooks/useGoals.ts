import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from '@/api/client';

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  completed_at: string | null;
}

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => apiFetch<Goal[]>('/api/goals'),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiMutate<Goal>('/api/goals', 'POST', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, currentValue }: { goalId: number; currentValue: number }) =>
      apiMutate<Goal>(`/api/goals/${goalId}/progress`, 'PATCH', { currentValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, status }: { goalId: number; status: string }) =>
      apiMutate<Goal>(`/api/goals/${goalId}/status`, 'PATCH', { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
