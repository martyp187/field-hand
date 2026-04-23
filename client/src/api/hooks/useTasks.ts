import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from '@/api/client';

export interface Task {
  id: number;
  farm_id: number | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  due_date: string | null;
  created_by_nickname: string | null;
  created_at: string;
  completed_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
}

export interface TaskTemplate {
  id: number;
  farm_id: number | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  trigger_type: string | null;
  trigger_value: string | null;
  last_generated_at: string | null;
}

interface TaskFilters {
  farmId?: number;
  status?: string;
  category?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.farmId) params.set('farmId', String(filters.farmId));
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  const qs = params.toString();

  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => apiFetch<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function usePlayerTasks(nickname: string | null) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'player', nickname],
    queryFn: () => apiFetch<Task[]>(`/api/players/${encodeURIComponent(nickname!)}/tasks`),
    enabled: !!nickname,
  });
}

export function useTaskTemplates() {
  return useQuery<TaskTemplate[]>({
    queryKey: ['tasks', 'templates'],
    queryFn: () => apiFetch<TaskTemplate[]>('/api/tasks/templates'),
  });
}

export function useClaimTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, playerNickname }: { taskId: number; playerNickname: string }) =>
      apiMutate<Task>(`/api/tasks/${taskId}/claim`, 'PATCH', { playerNickname }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUnclaimTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => apiMutate<Task>(`/api/tasks/${taskId}/unclaim`, 'PATCH'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      apiMutate<Task>(`/api/tasks/${taskId}/status`, 'PATCH', { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiMutate<TaskTemplate>('/api/tasks/templates', 'POST', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: number) =>
      apiMutate<void>(`/api/tasks/templates/${templateId}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'templates'] }),
  });
}

export function useGenerateFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      context,
    }: {
      templateId: number;
      context: Record<string, unknown>;
    }) =>
      apiMutate<{ generated: number; task: Task | null }>(
        `/api/tasks/templates/${templateId}/generate`,
        'POST',
        context,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiMutate<Task>('/api/tasks', 'POST', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
