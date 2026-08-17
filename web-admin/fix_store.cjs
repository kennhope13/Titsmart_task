const fs = require('fs');
let content = fs.readFileSync('src/services/realtimeStore.ts', 'utf8');

content = content.replace(
  /createEngineer: \(input: { name: string; phone\?: string; email\?: string; title\?: string; projectCodes\?: string\[\] }\) => Promise<Engineer>;/,
  'createEngineer: (input: { name: string; phone?: string; email?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[] }) => Promise<Engineer>;'
);

content = content.replace(
  /updateEngineer: \(id: string, input: { name: string; phone\?: string; title\?: string; projectCodes\?: string\[\] }\) => Promise<Engineer>;/,
  'updateEngineer: (id: string, input: { name: string; phone?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[] }) => Promise<Engineer>;'
);

content = content.replace(
  /const created = await api\.engineers\.create\({/,
  `const created = await api.engineers.create({
          role: input.role,
          username: input.username,
          password: input.password,
          isLocked: input.isLocked,`
);

content = content.replace(
  /const updated = await api\.engineers\.update\(id, {/,
  `const updated = await api.engineers.update(id, {
          role: input.role,
          username: input.username,
          password: input.password,
          isLocked: input.isLocked,`
);

fs.writeFileSync('src/services/realtimeStore.ts', content);
console.log('Fixed realtimeStore.ts');
