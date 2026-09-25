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
