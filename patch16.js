const fs = require('fs');
const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Modify renderActionText to handle |Detail:
const target = `const renderActionText = (text: string) => {
    if (!text) return text;
    const splitIndex = text.indexOf(': ');
    if (splitIndex !== -1) {
      const actionPart = text.substring(0, splitIndex + 1);
      const variablePart = text.substring(splitIndex + 2);
      return (
        <>
          {actionPart} <span className="font-extrabold">{variablePart}</span>
        </>
      );
    }
    return text;
  };`;

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
      renderedMain = mainText;
    }

    if (fullDetail && detailText) {
      return (
        <div className="flex flex-col gap-2">
          <div>{renderedMain}</div>
          <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100 italic">
            {detailText}
          </div>
        </div>
      );
    }
    return renderedMain;
  };`;

content = content.replace(target, replacement);

// And update the modal usage
const modalUsageTarget = `{renderActionText(selectedLog.action)}`;
const modalUsageReplacement = `{renderActionText(selectedLog.action, true)}`;

// Only replace the second occurrence (the modal one)
let occurrences = 0;
content = content.replace(/\{renderActionText\(selectedLog\.action\)\}/g, (match) => {
    return `{renderActionText(selectedLog.action, true)}`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ActivityLogPage for details');
