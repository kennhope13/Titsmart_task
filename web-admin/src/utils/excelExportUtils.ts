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

  // Xác định danh sách headers & keys
  let headers: string[] = [];
  if (customHeaders && customHeaders.length > 0) {
    headers = customHeaders;
  } else if (columns && columns.length > 0) {
    headers = columns.map(c => c.header);
  } else {
    headers = Object.keys(data[0]);
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

  // Điền dữ liệu các dòng
  data.forEach((item, rowIdx) => {
    const rowValues = headers.map(h => {
      const val = item[h];
      return val !== undefined && val !== null ? val : '';
    });

    const currentRow = worksheet.addRow(rowValues);
    currentRow.height = 22;

    const isEven = rowIdx % 2 === 0;

    currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerName = headers[colNumber - 1] || '';
      const lowerHeader = headerName.toLowerCase();
      const val = cell.value;

      // Font Times New Roman 11pt
      cell.font = {
        name: 'Times New Roman',
        size: 11,
        color: { argb: 'FF0F172A' },
      };

      // Nền xen kẽ (Zebra striping)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
      };

      // Viền mỏng
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Canh lề thông minh theo loại cột
      if (
        lowerHeader === 'stt' ||
        lowerHeader === '#' ||
        lowerHeader.includes('ngày') ||
        lowerHeader.includes('đơn vị') ||
        lowerHeader.includes('đvt') ||
        lowerHeader.includes('mã') ||
        lowerHeader.includes('giờ') ||
        lowerHeader.includes('loại') ||
        lowerHeader.includes('trạng thái') ||
        lowerHeader.includes('ưu tiên')
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

  // Tự động tính toán độ rộng (column width) để không bao giờ bị cắt chữ
  headers.forEach((header, colIdx) => {
    let maxLen = header.length;

    data.forEach(row => {
      const rawVal = row[header];
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal);
        const lines = strVal.split('\n');
        lines.forEach(line => {
          if (line.length > maxLen) {
            maxLen = line.length;
          }
        });
      }
    });

    // Cột ngắn tối thiểu 12, cột dài tối đa 65 (để tự xuống dòng)
    const padding = 4;
    const computedWidth = Math.min(Math.max(maxLen + padding, 12), 65);

    worksheet.getColumn(colIdx + 1).width = computedWidth;
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
