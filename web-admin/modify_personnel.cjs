const fs = require('fs');
const file = 'src/pages/PersonnelPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file should already have the changes from the first modify_personnel.cjs EXCEPT toggleLock and the types issues.
// Let's re-apply the whole thing but carefully. Wait, since I just ran `git checkout`, the file is reset to before I ran modify_personnel.cjs.

// 1. Remove lockedIds
content = content.replace(/const \[lockedIds, setLockedIds\] = useState<string\[\]>\(\[\]\);\n/, '');

// 2. Add username and password state
content = content.replace(
  /const \[role, setRole\] = useState\('Nhân viên\/Thợ'\);/,
  `const [role, setRole] = useState('Nhân viên/Thợ');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');`
);

// 3. toggleLock implementation
content = content.replace(
  /const toggleLock = \(id: string\) => {\s+setLockedIds\(prev => \(prev\.includes\(id\) \? prev\.filter\(x => x !== id\) : \[\.\.\.prev, id\]\)\);\s+};/,
  `const toggleLock = async (person: any) => {
    try {
      const newStatus = !person.locked;
      await updateEngineer(person.id, { isLocked: newStatus } as any);
      triggerToast(\`Đã \${newStatus ? 'khóa' : 'mở khóa'} tài khoản \${person.name}\`, 'success');
    } catch (e: any) {
      triggerToast(\`Lỗi: \${e?.message}\`, 'warning');
    }
  };`
);

// 4. resetForm
content = content.replace(
  /setRole\('Nhân viên\/Thợ'\);/,
  `setRole('Nhân viên/Thợ');\n    setUsername('');\n    setPassword('');`
);

// 5. people useMemo - lock status
content = content.replace(
  /locked: lockedIds\.includes\(engineer\.id\),/,
  `locked: (engineer as any).isLocked || false,\n      username: (engineer as any).username || '',\n      role: (engineer as any).role || engineer.title?.trim() || 'Nhân viên/Thợ',`
);

content = content.replace(
  /role: engineer\.title\?\.trim\(\) \|\| 'Nhân viên\/Thợ',/,
  ``
);

// 6. filter dependency
content = content.replace(
  /\[engineers, filter, lockedIds, searchTerm\]/,
  `[engineers, filter, searchTerm]`
);

// 7. openEditModal
content = content.replace(
  /setRole\(person\.role \|\| 'Nhân viên\/Thợ'\);/,
  `setRole(person.role || 'Nhân viên/Thợ');\n    setUsername((person as any).username || '');\n    setPassword('');`
);

// 8. handleSavePerson create/update
content = content.replace(
  /await updateEngineer\(editingPersonId, {[\s\S]*?}\);/,
  `await updateEngineer(editingPersonId, {
          name: name.trim(),
          phone,
          title: role,
          role,
          ...(username ? { username: username.trim() } : {}),
          ...(password ? { password } : {}),
          projectCodes: selectedProjectCodes,
        });`
);

content = content.replace(
  /await createEngineer\({[\s\S]*?}\);/,
  `await createEngineer({
          name: name.trim(),
          phone,
          title: role,
          role,
          username: username.trim(),
          password,
          projectCodes: selectedProjectCodes,
        });`
);

// 9. Change Header
content = content.replace(
  />NHÂN SỰ<\/h2>/,
  `>TÀI KHOẢN & NHÂN SỰ</h2>`
);

// 10. Table header
content = content.replace(
  /<th className="text-left p-3 bg-slate-50">Họ tên<\/th><th className="text-left p-3 bg-slate-50">Mã NV<\/th>/,
  `<th className="text-left p-3 bg-slate-50">Họ tên</th><th className="text-left p-3 bg-slate-50">Mã NV</th><th className="text-left p-3 bg-slate-50">Tài khoản</th>`
);

// 11. Table row
content = content.replace(
  /<td className="p-3 font-mono font-bold text-primary whitespace-nowrap">{person.code}<\/td>/,
  `<td className="p-3 font-mono font-bold text-primary whitespace-nowrap">{person.code}</td>\n                    <td className="p-3 text-slate-700 font-semibold whitespace-nowrap">{person.username || '-'}</td>`
);

content = content.replace(
  /<td className="p-3 font-semibold text-slate-700 whitespace-nowrap">{person.role}<\/td>/,
  `<td className="p-3 whitespace-nowrap">
                      <span className={\`px-2 py-0.5 rounded text-[11px] font-bold \${
                        person.role === 'Quản trị viên' ? 'bg-purple-100 text-purple-700' :
                        person.role === 'Quản lý dự án' ? 'bg-blue-100 text-blue-700' :
                        person.role === 'Kỹ sư hiện trường' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }\`}>
                        {person.role}
                      </span>
                    </td>`
);

// 12. Fix toggleLock call in JSX
content = content.replace(
  /toggleLock\(person\.id\);/,
  `toggleLock(person);`
);

// 13. Update Modal inputs
const modalInputs = `
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Vai trò / Phân quyền <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    >
                      <option value="Quản trị viên">Quản trị viên (Admin)</option>
                      <option value="Quản lý dự án">Quản lý dự án (Manager)</option>
                      <option value="Kỹ sư hiện trường">Kỹ sư hiện trường (Engineer)</option>
                      <option value="Nhân viên/Thợ">Nhân viên/Thợ (Worker)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Tên đăng nhập <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        placeholder="VD: nguyenvan_a"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Mật khẩu {editingPersonId ? '' : '<span className="text-red-500">*</span>'}</label>
                      <input
                        type="password"
                        required={!editingPersonId}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        placeholder={editingPersonId ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"}
                      />
                    </div>
                  </div>
`;

content = content.replace(
  /<div>\s*<label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Vai trò[\s\S]*?<\/div>/,
  modalInputs
);

fs.writeFileSync(file, content);
console.log("PersonnelPage updated");
