import re

with open('web-admin/src/pages/TaskManagementPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the small add button from regular task rows
pattern = r'<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleAddSubtask\(t\); \}\} className="ml-1 p-0\.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="thêm hạng mục mới"><span className="material-symbols-outlined text\[14px\]">add_circle</span></button>'

new_content = re.sub(pattern, '', content)

with open('web-admin/src/pages/TaskManagementPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Removed small add buttons')
