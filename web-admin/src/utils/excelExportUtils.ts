import ExcelJS from 'exceljs';

export interface ExportColumnConfig {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
}

export interface StyledExcelExportOptions {
  fileName: string;
  sheetName?: string;
  title?: string;
  data: Record<string, any>[];
  columns?: ExportColumnConfig[];
  customHeaders?: string[];
}

/**
 * Xuất dữ liệu ra file Excel (.xlsx) chuẩn:
 * - 100% font chữ 'Times New Roman'
 * - Tự động tính toán độ rộng (width) từng cột đủ chứa toàn bộ nội dung, không bị co rút/cắt chữ
 * - Header được định dạng chuyên nghiệp, rõ ràng, in đậm
 * - Canh lề thông minh (STT/Ngày/Mã: Giữa, Số lượng/Tiền: Phải, Tên/Mô tả/Ghi chú: Trái)
 * - Đường viền (borders) và chiều cao hàng tiêu chuẩn
 */
export async function exportToStyledExcel({
  fileName,
  sheetName = 'Sheet1',
  title,
  data,
  columns,
  customHeaders,
}: StyledExcelExportOptions): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('Không có dữ liệu để xuất Excel');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TITSMART System';
  workbook.lastModifiedBy = 'TITSMART System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sanitizedSheetName = sheetName.replace(/[*?:/\\\[\]]/g, '_').slice(0, 31) || 'DuLieu';
  const worksheet = workbook.addWorksheet(sanitizedSheetName, {
    views: [{ showGridLines: true }],
  });

  // Xác định danh sách headers & keys (loại bỏ các trường metadata bắt đầu bằng _)
  let headers: string[] = [];
  if (customHeaders && customHeaders.length > 0) {
    headers = customHeaders;
  } else if (columns && columns.length > 0) {
    headers = columns.map(c => c.header);
  } else {
    headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
  }

  let startRowIndex = 1;

  // Tiêu đề lớn đầu bảng (nếu có)
  if (title) {
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title.toUpperCase();
    titleCell.font = {
      name: 'Times New Roman',
      size: 14,
      bold: true,
      color: { argb: 'FF1E3A8A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 32;

    // Dòng ngày xuất
    worksheet.mergeCells(2, 1, 2, headers.length);
    const dateCell = worksheet.getCell(2, 1);
    const todayStr = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    dateCell.value = `Thời gian xuất: ${todayStr}`;
    dateCell.font = {
      name: 'Times New Roman',
      size: 10,
      italic: true,
      color: { argb: 'FF64748B' },
    };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    startRowIndex = 4; // Bắt đầu header ở dòng 4
  }

  // Thiết lập Header Row
  const headerRow = worksheet.getRow(startRowIndex);
  headerRow.values = headers;
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Times New Roman',
      size: 11.5,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Xanh Navy chuyên nghiệp
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // 1. Tự động tính toán độ rộng (column width) co giãn chuẩn xác theo nội dung của từng cột
  const columnWidths: number[] = headers.map((header) => {
    let maxLen = header.length;

    data.forEach((row) => {
      const rawVal = row[header];
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal);
        const lines = strVal.split(/\r?\n/);
        lines.forEach((line) => {
          // Tính chiều dài hiển thị thực tế (ký tự tiếng Việt có dấu/hoa chiếm ~1.15-1.2 độ rộng chuẩn)
          const weightedLen = [...line].reduce((acc, ch) => {
            return acc + (/[\u00C0-\u1EF9\u0110\u0111A-Z]/.test(ch) ? 1.2 : 1.0);
          }, 0);
          if (weightedLen > maxLen) {
            maxLen = weightedLen;
          }
        });
      }
    });

    const lowerHeader = header.toLowerCase();
    const padding = 4; // Khoảng đệm 2 bên ô

    // Tự động co giãn theo nội dung, tối thiểu 8 cho cột ngắn, mở rộng thoải mái cho nội dung dài
    if (lowerHeader === 'stt' || lowerHeader === '#' || lowerHeader === 'tt') {
      return Math.max(Math.ceil(maxLen + padding), 10);
    }
    if (lowerHeader.includes('mô tả') || lowerHeader.includes('nội dung') || lowerHeader.includes('tên')) {
      return Math.max(Math.ceil(maxLen + padding), 45);
    }
    if (lowerHeader === 'đvt' || lowerHeader === 'đơn vị' || lowerHeader === 'đv') {
      return Math.max(Math.ceil(maxLen + padding), 10);
    }

    // Co giãn hoàn toàn tự động theo độ dài dài nhất của cột
    return Math.max(Math.ceil(maxLen + padding), 14);
  });

  // Gán độ rộng cột co giãn vào worksheet
  columnWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // 2. Điền dữ liệu từng dòng và co giãn chiều cao dòng tự động
  data.forEach((item, rowIdx) => {
    const rowValues = headers.map((h) => {
      const val = item[h];
      return val !== undefined && val !== null ? val : '';
    });

    const currentRow = worksheet.addRow(rowValues);
    const isEven = rowIdx % 2 === 0;
    const isSection = !!(item._isSectionHeader || item.isSectionHeader);
    const depth = Number(item._depth !== undefined ? item._depth : (item.depth !== undefined ? item.depth : 0));
    const isMajorSec = isSection && depth === 0;
    const isSubSec = isSection && depth > 0;

    // Đếm số dòng nội dung thực tế trong row này (xuống dòng thủ công hoặc văn bản cực dài)
    let maxLinesInRow = 1;
    headers.forEach((header, colIdx) => {
      const rawVal = item[header];
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal).trim();
        if (strVal) {
          const explicitLines = strVal.split(/\r?\n/).length;
          const colWidth = columnWidths[colIdx] || 20;
          const wrappedLines = Math.ceil(strVal.length / Math.max(colWidth - 2, 10));
          const totalLines = Math.max(explicitLines, wrappedLines);
          if (totalLines > maxLinesInRow) {
            maxLinesInRow = totalLines;
          }
        }
      }
    });

    // Chiều cao dòng tự động co giãn: 1 dòng = 24pt, nhiều dòng = tự mở rộng theo số dòng
    currentRow.height = maxLinesInRow > 1 ? Math.max(26, maxLinesInRow * 19 + 8) : (isMajorSec ? 28 : 24);

    currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerName = headers[colNumber - 1] || '';
      const lowerHeader = headerName.toLowerCase();
      const val = cell.value;

      // Font Times New Roman
      cell.font = {
        name: 'Times New Roman',
        size: isMajorSec ? 11.5 : 11,
        bold: isSection,
        color: { argb: 'FF0F172A' },
      };

      // Nền hàng (Mục lớn: xám xanh nhẹ, mục con: xám nhạt, việc thường: xen kẽ trắng/xám siêu nhạt)
      if (isMajorSec) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
      } else if (isSubSec) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFFAFAFA' },
        };
      }

      // Viền ô
      cell.border = {
        top: { style: isMajorSec ? 'medium' : 'thin', color: { argb: isMajorSec ? 'FF94A3B8' : 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: isMajorSec ? 'medium' : 'thin', color: { argb: isMajorSec ? 'FF94A3B8' : 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Canh lề thông minh theo loại cột
      if (
        lowerHeader === 'stt' ||
        lowerHeader === '#' ||
        lowerHeader === 'tt' ||
        lowerHeader.includes('ngày') ||
        lowerHeader.includes('đơn vị') ||
        lowerHeader.includes('đvt') ||
        lowerHeader.includes('mã') ||
        lowerHeader.includes('giờ') ||
        lowerHeader.includes('loại') ||
        lowerHeader.includes('trạng thái') ||
        lowerHeader.includes('ưu tiên') ||
        lowerHeader.includes('chứng từ')
      ) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      } else if (
        typeof val === 'number' ||
        lowerHeader.includes('tiền') ||
        lowerHeader.includes('chi phí') ||
        lowerHeader.includes('giá trị') ||
        lowerHeader.includes('tồn') ||
        lowerHeader.includes('nhập') ||
        lowerHeader.includes('xuất') ||
        lowerHeader.includes('khối lượng') ||
        lowerHeader.includes('số lượng') ||
        lowerHeader.includes('sl') ||
        lowerHeader.includes('tỷ lệ') ||
        lowerHeader.includes('tiến độ')
      ) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof val === 'number' && !Number.isInteger(val)) {
          cell.numFmt = '#,##0.00';
        } else if (typeof val === 'number') {
          cell.numFmt = '#,##0';
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });
  });

  // Xuất file và tải về trình duyệt
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
