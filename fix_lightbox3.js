const fs = require('fs');
const file = 'web-admin/src/pages/FieldLogsPage.tsx';
let f = fs.readFileSync(file, 'utf8');

// Normalize newlines
f = f.replace(/\r\n/g, '\n');

const oldLightboxRegex = /const Lightbox: React\.FC<\{ images: string\[\]; index: number; onClose: \(\) => void; onPrev: \(\) => void; onNext: \(\) => void \}> = \(\{[\s\S]*?\}\) => \([\s\S]*?<\/div>\s*\);/m;

const newLightbox = `const Lightbox: React.FC<{ images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({
  images, index, onClose, onPrev, onNext,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 overflow-auto text-center whitespace-nowrap" onClick={onClose}>
      {/* Header / Actions */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
        <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md">
          {index + 1} / {images.length}
        </span>
        <button onClick={onClose} className="rounded-full bg-black/50 p-2 text-white hover:bg-white/20 transition pointer-events-auto shadow-lg backdrop-blur-md cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Center ghost element */}
      <span className="inline-block h-full align-middle" />
      
      {/* Image */}
      <img 
        src={images[index]} 
        alt="Ảnh hiện trường" 
        className={\`inline-block align-middle rounded-lg shadow-2xl transition-all duration-200 \${isZoomed ? 'w-auto h-auto max-w-none max-h-none cursor-zoom-out' : 'max-w-full max-h-screen object-contain cursor-zoom-in'}\`}
        onClick={(e) => { 
          e.stopPropagation(); 
          setIsZoomed(!isZoomed); 
        }} 
      />

      {/* Navigation */}
      {images.length > 1 && !isZoomed && (
        <>
          {index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onPrev(); setIsZoomed(false); }}
              className="fixed left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-white/20 transition shadow-lg backdrop-blur-md">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}
          {index < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); onNext(); setIsZoomed(false); }}
              className="fixed right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-white/20 transition shadow-lg backdrop-blur-md">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};`;

if (!oldLightboxRegex.test(f)) {
  console.log("Could not find Lightbox component with regex!");
} else {
  f = f.replace(oldLightboxRegex, newLightbox);
  fs.writeFileSync(file, f, 'utf8');
  console.log("Replaced Lightbox component with zoom feature.");
}
