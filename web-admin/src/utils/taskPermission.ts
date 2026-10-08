import { AuthUser } from '../services/authStore';
import { Task, Engineer, ProjectMaterialPlan } from '../types';

/**
 * Normalizes a string for comparison (trims, lowercases, NFC)
 */
export const normalizeText = (str?: string | null): string => {
  if (!str) return '';
  return String(str)
    .normalize('NFC')
    .trim()
    .toLowerCase();
};

/**
 * Checks if current user is the Assignee of the task
 */
export const isUserTaskAssignee = (
  user: AuthUser | null | undefined,
  task: Task | null | undefined,
  engineers?: Engineer[]
): boolean => {
  if (!user || !task) return false;

  const uId = normalizeText(user.id);
  const uName = normalizeText(user.name);
  const uUsername = normalizeText(user.username);

  // Find linked engineer if exists
  const myEng = engineers?.find(e => {
    const eId = normalizeText(e.id);
    const eName = normalizeText(e.name);
    const eUsername = normalizeText(e.username);
    return (
      (uId && eId === uId) ||
      (uUsername && eUsername === uUsername) ||
      (uName && eName === uName)
    );
  });

  const myEngId = myEng ? normalizeText(myEng.id) : '';
  const myEngName = myEng ? normalizeText(myEng.name) : '';

  const allMyIds = [uId, uUsername, myEngId].filter(Boolean);
  const allMyNames = [uName, uUsername, myEngName].filter(Boolean);

  // 1. Check assignedEngineerId
  if (task.assignedEngineerId) {
    const assignedIds = String(task.assignedEngineerId)
      .split(',')
      .map(s => normalizeText(s));
    if (allMyIds.some(id => assignedIds.includes(id))) {
      return true;
    }
  }

  // 2. Check assignedEngineerName
  if (task.assignedEngineerName) {
    const rawEngName = String(task.assignedEngineerName);
    const parts = rawEngName.split('|');
    const namePart = normalizeText(parts[0]);
    const idPart = parts.length > 1 ? normalizeText(parts[1]) : '';

    // If pipe ID part matches my IDs
    if (idPart) {
      const pipeIds = idPart.split(',').map(s => normalizeText(s));
      if (allMyIds.some(id => pipeIds.includes(id))) {
        return true;
      }
    }

    // Check names (supports comma-separated multi assignees)
    const assignedNames = namePart.split(',').map(s => normalizeText(s));
    for (const aName of assignedNames) {
      if (!aName) continue;
      for (const myName of allMyNames) {
        if (!myName) continue;
        if (aName === myName || aName.includes(myName) || myName.includes(aName)) {
          return true;
        }
      }
    }

    // Direct substring check
    const normWhole = normalizeText(rawEngName);
    if (allMyNames.some(mn => normWhole.includes(mn)) || allMyIds.some(id => normWhole.includes(id))) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if current user is the Assigner or Admin for the task
 */
export const isUserTaskAssigner = (
  user: AuthUser | null | undefined,
  task: Task | null | undefined,
  engineers?: Engineer[]
): boolean => {
  if (!user || !task) return false;

  const role = normalizeText(user.role);
  const username = normalizeText(user.username);
  if (role === 'admin' || role === 'quản trị viên' || username === 'admin') {
    return true;
  }

  const uId = normalizeText(user.id);
  const uName = normalizeText(user.name);
  const uUsername = normalizeText(user.username);

  // Find linked engineer if exists
  const myEng = engineers?.find(e => {
    const eId = normalizeText(e.id);
    const eName = normalizeText(e.name);
    const eUsername = normalizeText(e.username);
    return (
      (uId && eId === uId) ||
      (uUsername && eUsername === uUsername) ||
      (uName && eName === uName)
    );
  });

  const myEngId = myEng ? normalizeText(myEng.id) : '';
  const myEngName = myEng ? normalizeText(myEng.name) : '';

  const allMyIds = [uId, uUsername, myEngId].filter(Boolean);
  const allMyNames = [uName, uUsername, myEngName].filter(Boolean);

  if (task.assignerId) {
    const tAssignerId = normalizeText(task.assignerId);
    if (allMyIds.includes(tAssignerId)) return true;
  }

  if (task.assignerName) {
    const normAssignerName = normalizeText(task.assignerName);
    if (allMyNames.some(mn => normAssignerName === mn || normAssignerName.includes(mn) || mn.includes(normAssignerName))) {
      return true;
    }
  }

  if ((task as any).createdById) {
    const tCreatedById = normalizeText((task as any).createdById);
    if (allMyIds.includes(tCreatedById)) return true;
  }

  if ((task as any).createdByName) {
    const normCreatedByName = normalizeText((task as any).createdByName);
    if (allMyNames.some(mn => normCreatedByName === mn || normCreatedByName.includes(mn) || mn.includes(normCreatedByName))) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if current user is a Follower of the task
 */
export const isUserTaskFollower = (
  user: AuthUser | null | undefined,
  task: Task | null | undefined,
  engineers?: Engineer[]
): boolean => {
  if (!user || !task) return false;

  const uId = normalizeText(user.id);
  const uName = normalizeText(user.name);
  const uUsername = normalizeText(user.username);

  const allMyIds = [uId, uUsername].filter(Boolean);
  const allMyNames = [uName, uUsername].filter(Boolean);

  if (Array.isArray(task.followerIds)) {
    const fIds = task.followerIds.map(f => normalizeText(f));
    if (allMyIds.some(id => fIds.includes(id))) return true;
  }

  if (Array.isArray(task.followerNames)) {
    const fNames = task.followerNames.map(f => normalizeText(f).replace(/^[:|]+|[:|]+$/g, '').trim());
    for (const fn of fNames) {
      if (!fn) continue;
      for (const mn of allMyNames) {
        if (!mn) continue;
        if (fn === mn || fn.includes(mn) || mn.includes(fn)) return true;
      }
    }
  }

  return false;
};

/**
 * Resolves full follower display names from followerNames, followerIds, or raw tags
 */
export const getTaskFollowerNames = (task: Task | null | undefined, engineers?: Engineer[]): string[] => {
  if (!task) return [];

  // 1. Direct followerNames
  if (Array.isArray(task.followerNames) && task.followerNames.length > 0) {
    const cleanNames = task.followerNames
      .map(f => String(f).replace(/^[:|]+|[:|]+$/g, '').trim())
      .filter(Boolean);
    if (cleanNames.length > 0) return cleanNames;
  }

  // 2. Resolve from followerIds using engineers list
  if (Array.isArray(task.followerIds) && task.followerIds.length > 0) {
    const resolved = task.followerIds.map(fid => {
      const sId = String(fid).trim().toLowerCase();
      const found = engineers?.find(e => 
        String(e.id).trim().toLowerCase() === sId || 
        String(e.username || '').trim().toLowerCase() === sId ||
        String(e.code || '').trim().toLowerCase() === sId
      );
      return found ? found.name : fid;
    }).filter(Boolean);
    if (resolved.length > 0) return resolved;
  }

  // 3. Fallback: Parse directly from notes if tag exists
  if (task.notes && typeof task.notes === 'string' && task.notes.includes('[FOLLOWERS:')) {
    const match = task.notes.match(/\[FOLLOWERS:([^\]]+)\]/i);
    if (match) {
      const raw = match[1];
      let idPart = '';
      let namePart = '';
      if (raw.includes(':::')) {
        const parts = raw.split(':::');
        idPart = parts[0] || '';
        namePart = parts[1] || '';
      } else if (raw.includes('|||')) {
        const parts = raw.split('|||');
        idPart = parts[0] || '';
        namePart = parts[1] || '';
      } else if (raw.includes('|')) {
        const parts = raw.split('|');
        idPart = parts[0] || '';
        namePart = parts[1] || '';
      } else {
        idPart = raw;
      }

      if (namePart) {
        const names = namePart.split(',').map(s => s.replace(/^[:|]+|[:|]+$/g, '').trim()).filter(Boolean);
        if (names.length > 0) return names;
      }
      if (idPart && engineers && engineers.length > 0) {
        const ids = idPart.split(',').map(s => s.replace(/^[:|]+|[:|]+$/g, '').trim()).filter(Boolean);
        const resolved = ids.map(fid => {
          const sId = String(fid).trim().toLowerCase();
          const found = engineers.find(e => 
            String(e.id).trim().toLowerCase() === sId || 
            String(e.username || '').trim().toLowerCase() === sId
          );
          return found ? found.name : fid;
        }).filter(Boolean);
        if (resolved.length > 0) return resolved;
      }
    }
  }

  return [];
};

/**
 * Resolves the technical/material status (Tình trạng) for a task
 */
export const getTaskTechSpecStatus = (task: Task | null | undefined, materialPlans?: ProjectMaterialPlan[]): string => {
  if (!task) return '';
  if (task.techSpecStatus) return task.techSpecStatus;

  // Check from task notes tag [tech-status:...]
  const m = String(task.notes || '').match(/\[tech-status:([^\]]+)\]/i);
  if (m && m[1]) return m[1].trim();

  // Check from matching MaterialPlan
  if (materialPlans && materialPlans.length > 0 && task.projectCode) {
    const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const matched = materialPlans.find(mp => 
      mp.id === task.id ||
      (
        (mp.projectCode === task.projectCode || !mp.projectCode || !task.projectCode) &&
        (
          (norm(mp.stt) === norm(task.stt) && norm(mp.jobContent || (mp as any).name) === norm(task.name)) ||
          (task.stt && norm(mp.stt) === norm(task.stt)) ||
          (task.name && norm(mp.jobContent || (mp as any).name) === norm(task.name))
        )
      )
    );
    if (matched) {
      if (matched.techSpecStatus) return matched.techSpecStatus;
      const mpTag = String(matched.notes || '').match(/\[tech-status:([^\]]+)\]/i);
      if (mpTag && mpTag[1]) return mpTag[1].trim();
    }
  }

  return '';
};

/**
 * Resolves the purchasing / order status (TT Đặt hàng) for a task
 */
export const getTaskPurchaseStatus = (task: Task | null | undefined, materialPlans?: ProjectMaterialPlan[]): string => {
  if (!task) return '';
  if (task.purchaseStatus) return task.purchaseStatus;

  if (materialPlans && materialPlans.length > 0 && task.projectCode) {
    const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const matched = materialPlans.find(mp => 
      mp.id === task.id ||
      (
        (mp.projectCode === task.projectCode || !mp.projectCode || !task.projectCode) &&
        (
          (norm(mp.stt) === norm(task.stt) && norm(mp.jobContent || (mp as any).name) === norm(task.name)) ||
          (task.stt && norm(mp.stt) === norm(task.stt)) ||
          (task.name && norm(mp.jobContent || (mp as any).name) === norm(task.name))
        )
      )
    );
    if (matched && matched.orderedStatus) return matched.orderedStatus;
  }

  return '';
};

/**
 * Checks if a task meets the mandatory prerequisites to be assigned:
 * - Tình trạng: phải là 'Đáp ứng'
 * - TT Đặt hàng: phải là 'Đã có hàng' hoặc 'Có hàng'
 * Direct / internal tasks without material tracking are exempt.
 */
export const isTaskReadyForAssignment = (
  task: Task | null | undefined,
  materialPlans?: ProjectMaterialPlan[]
): { ready: boolean; reason?: string } => {
  if (!task) return { ready: false, reason: 'Công việc không tồn tại' };

  if (task.isSectionHeader) return { ready: false, reason: 'Không thể giao đầu mục nhóm' };

  // Direct / Company internal tasks without material tracking can be assigned directly
  const isDirectTask = task.sectionName === 'Giao việc trực tiếp' || 
                       task.projectCode === 'COMPANY' || 
                       task.code?.startsWith('TASK-DIRECT') ||
                       (!task.projectCode && !task.stt);
  if (isDirectTask) {
    return { ready: true };
  }

  const rawTech = getTaskTechSpecStatus(task, materialPlans);
  const rawPurchase = getTaskPurchaseStatus(task, materialPlans);

  const techStatus = normalizeText(rawTech);
  const purchaseStatus = normalizeText(rawPurchase);

  const isTechOk = techStatus === 'đáp ứng' || techStatus === 'dap ung';
  const isPurchaseOk = purchaseStatus === 'đã có hàng' || purchaseStatus === 'da co hang' || purchaseStatus === 'có hàng' || purchaseStatus === 'co hang';

  if (!isTechOk && !isPurchaseOk) {
    return {
      ready: false,
      reason: `Hạng mục "${task.name}" chưa đủ điều kiện giao việc: Tình trạng cần là "Đáp ứng" (hiện tại: ${rawTech || 'Chưa xác định'}) và TT Đặt hàng cần là "Đã có hàng" (hiện tại: ${rawPurchase || 'Chưa đặt hàng'}).`
    };
  }

  if (!isTechOk) {
    return {
      ready: false,
      reason: `Hạng mục "${task.name}" chưa đủ điều kiện giao việc: Tình trạng cần là "Đáp ứng" (hiện tại: ${rawTech || 'Chưa xác định'}).`
    };
  }

  if (!isPurchaseOk) {
    return {
      ready: false,
      reason: `Hạng mục "${task.name}" chưa đủ điều kiện giao việc: TT Đặt hàng cần là "Đã có hàng" (hiện tại: ${rawPurchase || 'Chưa đặt hàng'}).`
    };
  }

  return { ready: true };
};
