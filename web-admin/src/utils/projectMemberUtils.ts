import { Engineer, Project } from '../types';

/**
 * Filter and get the list of engineers belonging to a specific project.
 * Checks:
 * 1. project.members or project.memberIds array includes eng.id
 * 2. engineer.projectCodes includes project.code or project.id or project.name
 * 3. engineer.managedProjects or engineer.memberProjects includes project code/id/name
 * 4. project.managerId === eng.id
 * 5. project.managerName matches engineer name
 */
export const getEngineersForProject = (
  projectIdentifier: string | undefined | null,
  engineers: Engineer[],
  projects: Project[]
): Engineer[] => {
  if (!projectIdentifier || projectIdentifier === 'all' || !Array.isArray(engineers)) {
    return engineers || [];
  }

  const norm = (s?: string) => String(s || '').trim().toUpperCase();
  const searchKey = norm(projectIdentifier);

  // Find target project in projects list
  const targetProject = projects.find(p => 
    norm(p.code) === searchKey ||
    norm(p.id) === searchKey ||
    norm(p.name) === searchKey
  );

  const pCodeUpper = targetProject ? norm(targetProject.code) : searchKey;
  const pIdUpper = targetProject ? norm(targetProject.id) : searchKey;
  const pNameUpper = targetProject ? norm(targetProject.name) : '';

  // Nếu là dự án chung / Chi phí văn phòng, trả về toàn bộ nhân sự
  if (
    searchKey === 'COMPANY' || 
    searchKey === 'OFFICE' || 
    searchKey === 'VAN_PHONG' || 
    searchKey === 'CHI_PHI_VAN_PHONG' ||
    pCodeUpper === 'CHI_PHI_VAN_PHONG' ||
    pCodeUpper === 'COMPANY' ||
    pNameUpper.includes('CHI PHI VAN PHONG') ||
    pNameUpper.includes('VAN PHONG')
  ) {
    return engineers || [];
  }

  const managerNames = targetProject?.managerName 
    ? targetProject.managerName.split(',').map(s => norm(s)).filter(Boolean)
    : [];

  const filtered = engineers.filter((eng) => {
    if (!eng || !eng.id) return false;
    const engIdUpper = norm(eng.id);
    const engNameUpper = norm(eng.name);

    // 1. Check if engineer is manager of project
    if (targetProject?.managerId && norm(targetProject.managerId) === engIdUpper) {
      return true;
    }

    // 2. Check if engineer name is listed in project.managerName
    if (managerNames.some(mName => mName === engNameUpper || engNameUpper.includes(mName) || mName.includes(engNameUpper))) {
      return true;
    }

    // 3. Check if engineer is in project.members or project.memberIds
    if (targetProject) {
      if (Array.isArray(targetProject.members) && targetProject.members.some(mId => norm(mId) === engIdUpper)) {
        return true;
      }
      if (Array.isArray(targetProject.memberIds) && targetProject.memberIds.some(mId => norm(mId) === engIdUpper)) {
        return true;
      }
    }

    // 4. Check engineer.projectCodes
    if (Array.isArray(eng.projectCodes)) {
      const hasCode = eng.projectCodes.some(c => {
        const u = norm(c);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      });
      if (hasCode) return true;
    }

    // 5. Check engineer.managedProjects
    if (Array.isArray(eng.managedProjects)) {
      const hasManaged = eng.managedProjects.some(p => {
        const u = norm(p.code || p.name);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      });
      if (hasManaged) return true;
    }

    // 6. Check engineer.memberProjects
    if (Array.isArray(eng.memberProjects)) {
      const hasMemberProj = eng.memberProjects.some(p => {
        const u = norm(p.code || p.name);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      });
      if (hasMemberProj) return true;
    }

    return false;
  });

  return filtered;
};

/**
 * Check if a user is an authorized member/manager/viewer of a project.
 * Returns true for Admin, PM, Project Managers, and explicit project members.
 */
export const isUserMemberOfProject = (
  user: any,
  project: Project,
  engineers?: Engineer[]
): boolean => {
  if (!user || !project) return false;

  const role = String(user.role || '').toLowerCase();
  const username = String(user.username || '').toLowerCase();
  // Admin & PM always have full access to all projects
  if (
    username === 'admin' ||
    role === 'admin' ||
    role === 'pm' ||
    role === 'quản trị viên' ||
    role === 'quản lý dự án'
  ) {
    return true;
  }

  const norm = (s?: string) => String(s || '').trim().toUpperCase();
  const userId = norm(user.id);
  const userUsername = norm(user.username);
  const userName = norm(user.name);

  const pCodeUpper = norm(project.code);
  const pIdUpper = norm(project.id);
  const pNameUpper = norm(project.name);

  // 0. Dự án nội bộ / Chi phí văn phòng / Chung công ty luôn hiển thị cho tất cả thành viên
  const isCompanyInternalProject = 
    pCodeUpper === 'COMPANY' || 
    pCodeUpper === 'OFFICE' || 
    pCodeUpper === 'VAN_PHONG' || 
    pCodeUpper === 'CHI_PHI_VAN_PHONG' ||
    pNameUpper.includes('CHI PHI VAN PHONG') ||
    pNameUpper.includes('VAN PHONG');
  if (isCompanyInternalProject) {
    return true;
  }

  // 1. Check if user is manager of project
  if (project.managerId && (norm(project.managerId) === userId || norm(project.managerId) === userUsername)) {
    return true;
  }
  if (project.managerName && norm(project.managerName).includes(userName)) {
    return true;
  }

  // 2. Check if user is in project.members or project.memberIds
  if (Array.isArray(project.members) && project.members.some(m => norm(m) === userId || norm(m) === userUsername || norm(m) === userName)) {
    return true;
  }
  if (Array.isArray(project.memberIds) && project.memberIds.some(m => norm(m) === userId || norm(m) === userUsername)) {
    return true;
  }

  // 3. Check user.projectCodes
  const userCodes = Array.isArray(user.projectCodes) ? user.projectCodes : [];
  if (userCodes.some((c: string) => {
    const u = norm(c);
    return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
  })) {
    return true;
  }

  // 4. Also check corresponding engineer record in engineers store
  if (engineers && Array.isArray(engineers)) {
    const matchedEng = engineers.find(e => norm(e.id) === userId || norm(e.username) === userUsername || (userName && norm(e.name) === userName));
    if (matchedEng) {
      const engIdUpper = norm(matchedEng.id);
      const engNameUpper = norm(matchedEng.name);

      const isMember = (Array.isArray(project.members) && project.members.some(m => norm(m) === engIdUpper || norm(m) === engNameUpper)) ||
                       (Array.isArray(project.memberIds) && project.memberIds.some(m => norm(m) === engIdUpper || norm(m) === engNameUpper));
      const isManager = project.managerId ? norm(project.managerId) === engIdUpper : false;
      if (isMember || isManager) return true;

      if (Array.isArray(matchedEng.projectCodes) && matchedEng.projectCodes.some((c: string) => {
        const u = norm(c);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      })) {
        return true;
      }
      if (Array.isArray(matchedEng.managedProjects) && matchedEng.managedProjects.some((p: any) => {
        const u = norm(p.code || p.name);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      })) {
        return true;
      }
      if (Array.isArray(matchedEng.memberProjects) && matchedEng.memberProjects.some((p: any) => {
        const u = norm(p.code || p.name);
        return u && (u === pCodeUpper || u === pIdUpper || (pNameUpper && u === pNameUpper));
      })) {
        return true;
      }
    }
  }

  return false;
};
