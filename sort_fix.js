const fs = require('fs');
const filepath = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Add getTimestampMs
const getTimestampMsCode = `
const getTimestampMs = (timestamp: string): number => {
  if (!timestamp) return 0;
  const iso = new Date(timestamp);
  if (!Number.isNaN(iso.getTime())) return iso.getTime();
  
  const parts = timestamp.split(' ');
  if (parts.length === 2) {
    const timeParts = parts[0].split(':');
    const dateParts = parts[1].split('/');
    if (dateParts.length === 3 && timeParts.length >= 2) {
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10) - 1;
      const y = parseInt(dateParts[2], 10);
      const h = parseInt(timeParts[0], 10);
      const min = parseInt(timeParts[1], 10);
      return new Date(y, m, d, h, min).getTime();
    }
  }
  return 0;
};
`;

if (!content.includes('const getTimestampMs')) {
  content = content.replace('const parseTime =', getTimestampMsCode + '\nconst parseTime =');
}

// 2. Sort filteredLogs
if (!content.includes('getTimestampMs(b.timestamp || \'\')')) {
  content = content.replace(
    /return matchDate && matchSearch;\n      \}\);/,
    "return matchDate && matchSearch;\n      }).sort((a, b) => getTimestampMs(b.timestamp || '') - getTimestampMs(a.timestamp || ''));"
  );
}

// 3. Update groupedLogs to use Map
if (!content.includes('const groups: { label: string; logs: typeof activityLogs }[] = [];')) {
  const newGroupedLogs = `
    const groupedLogs = useMemo(() => {
      const groups: { label: string; logs: typeof activityLogs }[] = [];
      const map = new Map<string, typeof activityLogs>();

      filteredLogs.forEach((log) => {
        const dateKey = parseDateKey(log.timestamp || '');
        const label = formatDateLabel(dateKey);
        const headerText = dateKey !== 'unknown' ? (() => {
          const [y, m, d] = dateKey.split('-');
          return \`\${d}/\${m}/\${y}\`;
        })() : 'Không xác định';
  
        const finalLabel = label === headerText ? headerText : \`\${label} (\${headerText})\`;
        
        if (!map.has(finalLabel)) {
          map.set(finalLabel, []);
          groups.push({ label: finalLabel, logs: map.get(finalLabel)! });
        }
        map.get(finalLabel)!.push(log);
      });
      return groups;
    }, [filteredLogs]);
`;
  content = content.replace(/const groupedLogs = useMemo\(\(\) => \{[\s\S]*?\}, \[filteredLogs\]\);/, newGroupedLogs.trim());
}

// 4. Update the render loop
content = content.replace(/Object\.entries\(groupedLogs\)\.map\(\(\[dateLabel, logs\]\) => \(/g, "groupedLogs.map(({ label: dateLabel, logs }) => (");

fs.writeFileSync(filepath, content, 'utf-8');
console.log('Done!');
