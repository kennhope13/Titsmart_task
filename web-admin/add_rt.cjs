import fs from 'fs';

let content = fs.readFileSync('src/services/realtimeStore.ts', 'utf-8');

const oldRealtimeCode = `.on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, debouncedRefresh)`;

const newRealtimeCode = `.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
      debouncedRefresh();
      
      // Notification Logic for Activity Logs
      const log = payload.new;
      if (!log || !log.action || !log.user) return;
      
      const store = useRealtimeStore.getState();
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;
      
      const currentUserName = currentUser.name || currentUser.username || '';
      
      // Do not notify self
      if (log.user.trim().toLowerCase() === currentUserName.trim().toLowerCase()) return;
      
      // Rank calculation
      const getRank = (roleStr: string) => {
        if (!roleStr) return 1;
        const r = roleStr.toLowerCase();
        if (r === 'admin') return 3;
        if (r === 'pm') return 2;
        return 1;
      };
      
      const myRank = getRank(currentUser.role);
      
      // Find the rank of the user who made the action
      let theirRank = 1; // default lowest
      const engineers = store.engineers || [];
      const authorEngineer = engineers.find(e => e.name.trim().toLowerCase() === log.user.trim().toLowerCase());
      if (authorEngineer) {
        theirRank = getRank(authorEngineer.role);
      }
      
      // Hierarchy rule: Admin (3) sees all. PM (2) sees subordinates (1). Subordinates (1) see none (except their own project updates, but for now we follow the simple hierarchy: admin > pm > others)
      if (myRank === 3 || myRank > theirRank) {
        const title = log.project && log.project !== 'Hệ thống' && log.project !== 'COMPANY' 
          ? \`[\${log.project}] \${log.user}\` 
          : log.user;
          
        const newNotif = {
          id: 'notif-rt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          title: title,
          message: log.action,
          timestamp: 'Vừa xong',
          read: false,
          type: 'activity',
          icon: log.icon || 'notifications'
        };
        
        // Push to state
        useRealtimeStore.setState((state) => ({
          notifications: [newNotif, ...state.notifications]
        }));
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, debouncedRefresh)`;

content = content.replace(oldRealtimeCode, newRealtimeCode);

fs.writeFileSync('src/services/realtimeStore.ts', content);
