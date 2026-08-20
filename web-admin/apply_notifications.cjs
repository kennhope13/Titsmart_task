const fs = require('fs');
const filepath = 'src/services/realtimeStore.ts';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Add handleRealtimeActivity to interface RealtimeStoreState
if (!content.includes('handleRealtimeActivity: (log: any) => void;')) {
  content = content.replace(
    /logActivity: \(action: string, project: string, user\?: string\) => void;/g,
    "logActivity: (action: string, project: string, user?: string) => void;\n  handleRealtimeActivity: (log: any) => void;"
  );
}

// 2. Add handleRealtimeActivity implementation to set((state) => ...) block
const handleCode = `
    handleRealtimeActivity: (log) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;
      const currentUserName = currentUser.name || currentUser.username;
      
      if (log.user === currentUserName) return;

      const store = get();
      const doer = store.engineers.find((e) => e.name === log.user);
      const doerRole = doer ? doer.role : 'engineer';

      const roleRank: Record<string, number> = { admin: 3, pm: 2, hr: 1, accountant: 1, engineer: 1 };
      const myRank = roleRank[currentUser.role || 'engineer'] || 1;
      const theirRank = roleRank[doerRole || 'engineer'] || 1;

      if (myRank === 3 || myRank > theirRank) {
        // Here we format the title. If log.project is empty, don't show the [] brackets at all.
        const titleStr = log.project ? \`[\${log.project}] \${log.user}\` : \`\${log.user}\`;

        const newNotif = {
          id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          title: titleStr,
          message: log.action,
          timestamp: 'Vừa xong',
          read: false,
          type: 'system' as const,
          icon: log.icon || 'history',
        };
        // Avoid type mismatch by manually checking with type
        set((state) => {
          const nextNotifs = [newNotif as any, ...state.notifications];
          persistAndNotify({ notifications: nextNotifs });
          return { notifications: nextNotifs };
        });
      }
    },
    logActivity: (action, project, user) => {
`;
if (!content.includes('handleRealtimeActivity: (log) => {')) {
  content = content.replace(/logActivity: \(action, project, user\) => \{/g, handleCode.trim());
}

// 3. Update the realtimeChannel setup
const realtimeCodeOld = `.on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, debouncedRefresh)`;
const realtimeCodeNew = `.on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
      debouncedRefresh();
      if (payload.eventType === 'INSERT') {
        useRealtimeStore.getState().handleRealtimeActivity(payload.new);
      }
    })`;
if (!content.includes('handleRealtimeActivity(payload.new)')) {
  content = content.replace(realtimeCodeOld, realtimeCodeNew);
}

fs.writeFileSync(filepath, content, 'utf-8');
console.log('Done restoring realtimeStore.ts properly');
