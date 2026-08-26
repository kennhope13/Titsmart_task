const fs = require('fs');

const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// The messed up part is in the newDoc modal.
const messedUpPart = `<label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={newDoc.docType || 'Giao'} onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={editingDoc?.docType || 'Giao'} onChange={(e) => setEditingDoc(prev => prev ? {...prev, docType: e.target.value} : null)} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Dự án *</label>`;

const fixedNewDocPart = `<label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={newDoc.docType || 'Giao'} onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Dự án *</label>`;

data = data.replace(messedUpPart, fixedNewDocPart);

// Now we need to insert the editingDoc field into the editingDoc modal.
// Let's find the editingDoc modal's "Dự án *" label.
const editModalTarget = `<label className="block font-bold mb-1 truncate">Dự án *</label>
                <CustomSelect required value={editingDoc.projectCode`;

const editModalReplacement = `<label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
                <CustomSelect required value={editingDoc.docType || 'Giao'} onChange={(e) => setEditingDoc({...editingDoc, docType: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                  <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                  <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
                </CustomSelect>
                <label className="block font-bold mb-1 truncate">Dự án *</label>
                <CustomSelect required value={editingDoc.projectCode`;

data = data.replace(editModalTarget, editModalReplacement);

fs.writeFileSync(filePath, data);
console.log('Fixed modals');
