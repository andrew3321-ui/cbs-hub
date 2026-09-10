import { getCurrentUser } from './auth';
import { canManageWorkspace, getWorkspaceContext } from './workspace';
import { getWorkspaceEntitlements } from './plan-entitlements';
export async function githubApiContext(manage = false) {
 const user = await getCurrentUser();
 if (!user) return Response.json({ error: 'Faça login para acessar seus projetos.' }, { status: 401 });
 const workspace = await getWorkspaceContext(user.id);
 if (!workspace || manage && !canManageWorkspace(workspace.role)) return Response.json({ error: 'Acesso restrito à administração do workspace.' }, { status: 403 });
 if (!(await getWorkspaceEntitlements(workspace)).workspaceAccessAllowed) return Response.json({ error: 'O workspace ainda não está liberado.', code: 'CYBER_LAUNCH_GATE' }, { status: 423 });
 return { user, workspace, canManage: canManageWorkspace(workspace.role) };
}
