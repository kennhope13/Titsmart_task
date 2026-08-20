const fs = require('fs');
const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const renderActionText = \(text: string\) => \{[\s\S]*?return text;\s*\};/g;

const replacement = `const renderActionText = (text: string, fullDetail: boolean = false) => {
    if (!text) return text;
    
    // Check if it has |Detail:
    let mainText = text;
    let detailText = '';
    const detailIndex = text.indexOf(' |Detail:');
    if (detailIndex !== -1) {
      mainText = text.substring(0, detailIndex);
      detailText = text.substring(detailIndex + 9);
    }

    const splitIndex = mainText.indexOf(': ');
    let renderedMain;
    if (splitIndex !== -1) {
      const actionPart = mainText.substring(0, splitIndex + 1);
      const variablePart = mainText.substring(splitIndex + 2);
      renderedMain = (
        <>
          {actionPart} <span className="font-extrabold">{variablePart}</span>
        </>
      );
    } else {
      renderedMain = <>{mainText}</>;
    }

    if (fullDetail && detailText) {
      return (
        <div className="flex flex-col gap-2">
          <div>{renderedMain}</div>
          <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 italic shadow-sm whitespace-pre-wrap">
            {detailText}
          </div>
        </div>
      );
    }
    return renderedMain;
  };`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ActivityLogPage properly');
