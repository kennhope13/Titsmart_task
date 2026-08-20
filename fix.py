import os
filepath = 'web-admin/src/services/realtimeStore.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('\\\'', "'")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)
