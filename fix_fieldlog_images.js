const fs = require('fs');
const file = 'web-admin/src/pages/FieldLogsPage.tsx';
let f = fs.readFileSync(file, 'utf8');
f = f.replace(/\r\n/g, '\n');

// Update formatTimeOnly to include date
f = f.replace(/return new Date\(value\)\.toLocaleTimeString\('vi-VN', \{ hour: '2-digit', minute: '2-digit' \}\);/g, 
  "const d = new Date(value);\n    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;");

// Update Lightbox trigger to use all images in the project
f = f.replace(/<div className="flex flex-col p-5 space-y-6 max-h-\[600px\] overflow-y-auto">/g, 
  `const allProjectImages = logs.flatMap(l => l.images);\n                  <div className="flex flex-col p-5 space-y-6 max-h-[600px] overflow-y-auto">`);

// Replace the onClick setLightbox inside the map
// We need to find the absolute index in allProjectImages.
// We can do this by finding the index of the image in the allProjectImages array.
// But since images could technically be duplicate URLs (rare, but possible), it's better to just use indexOf, 
// or compute the offset.
// A safe way: onClick={() => setLightbox({ images: allProjectImages, index: allProjectImages.indexOf(img) })}
f = f.replace(/onClick=\{\(\) => setLightbox\(\{ images: log\.images, index: i \}\)\}/g,
  `onClick={() => setLightbox({ images: allProjectImages, index: allProjectImages.indexOf(img) })}`);

fs.writeFileSync(file, f, 'utf8');
console.log("Updated FieldLogsPage");
