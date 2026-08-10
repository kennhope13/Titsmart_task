import 'dart:io';
import 'package:excel/excel.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:csv/csv.dart';

class MobileOcrField {
  final String label;
  final String value;
  MobileOcrField({required this.label, required this.value});
}

class MobileOcrTableTask {
  final String stt;
  final String name;
  final double volume;
  final String unit;
  final String notes;
  final bool isSectionHeader;
  final String sectionName;
  final String supplyScope;

  MobileOcrTableTask({
    required this.stt,
    required this.name,
    required this.volume,
    required this.unit,
    required this.notes,
    required this.isSectionHeader,
    required this.sectionName,
    required this.supplyScope,
  });
}

class MobileOcrExtractedData {
  final List<MobileOcrField> fields;
  final List<MobileOcrTableTask> tableTasks;
  final String projectName;
  final String location;
  final String client;
  final String rawText;

  MobileOcrExtractedData({
    required this.fields,
    required this.tableTasks,
    required this.projectName,
    required this.location,
    required this.client,
    required this.rawText,
  });
}

class MobileOcrService {
  static String _normalizeVietnameseText(String value) {
    return value.trim();
  }

  static String _normalizeLookupText(String value) {
    var withDiacritics = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    var withoutDiacritics = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
    var str = value.toLowerCase();
    for (int i = 0; i < withDiacritics.length; i++) {
      str = str.replaceAll(withDiacritics[i], withoutDiacritics[i]);
    }
    return str;
  }

  static String _compactSpaces(String value) {
    return value.replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  static String _getLineAfterLabel(List<String> lines, List<String> labels) {
    final normalizedLabels = labels.map((l) => _normalizeLookupText(l)).toList();
    for (final line in lines) {
      final lookupLine = _normalizeLookupText(line);
      final matchedLabel = normalizedLabels.any((label) => lookupLine.startsWith(label));
      if (!matchedLabel) continue;

      final colonIndex = line.indexOf(':');
      final dashIndex = line.indexOf('-');
      final separatorIndex = colonIndex >= 0 ? colonIndex : dashIndex;
      if (separatorIndex >= 0) {
        final value = _compactSpaces(line.substring(separatorIndex + 1));
        if (value.isNotEmpty) return value;
      }

      // Fallback: remove the label from the start of the string
      for (final label in labels) {
        final regex = RegExp('^\\s*$label\\s*', caseSensitive: false);
        final value = _compactSpaces(line.replaceAll(regex, ''));
        if (value.isNotEmpty && _normalizeLookupText(value) != lookupLine) return value;
      }
    }
    return '';
  }

  static bool _isLikelyTableHeader(List<String> cells) {
    final normalized = cells.map((c) => _normalizeLookupText(c)).toList();
    final hasStt = normalized.any((c) => c == 'stt' || c == 'tt' || c.contains('stt'));
    final hasContent = normalized.any((c) => c.contains('noi dung') || c.contains('hang muc') || c.contains('dien giai') || c.contains('mo ta'));
    final hasQuantity = normalized.any((c) => c.contains('khoi luong') || c.contains('so luong') || c.contains('don vi') || c.contains('dvt'));
    return hasStt && hasContent && hasQuantity;
  }

  static double _parseNumberValue(String value) {
    String raw = value.replaceAll(RegExp(r'\s+'), '');
    if (raw.isEmpty) return 0;
    String numeric = raw.replaceAll(RegExp(r'[^0-9,.-]'), '');
    if (numeric.isEmpty) return 0;
    
    if (numeric.contains(',') && !numeric.contains('.')) {
      numeric = numeric.replaceAll(',', '.');
    } else {
      numeric = numeric.replaceAll(',', '');
    }
    
    return double.tryParse(numeric) ?? 0;
  }

  static List<MobileOcrTableTask> _parseTableTasks(List<String> lines) {
    final rows = lines.map((l) => l.split(RegExp(r'\t|\s{2,}|\|'))).toList();
    int headerIndex = rows.indexWhere((cells) => _isLikelyTableHeader(cells));
    if (headerIndex < 0) return [];

    final header = rows[headerIndex].map((c) => _normalizeLookupText(c)).toList();
    int sttCol = header.indexWhere((c) => c.contains('stt') || c.contains('tt'));
    int nameCol = header.indexWhere((c) => c.contains('noi dung') || c.contains('hang muc') || c.contains('dien giai') || c.contains('mo ta'));
    int volumeCol = header.indexWhere((c) => c.contains('khoi luong') || c.contains('so luong'));
    int unitCol = header.indexWhere((c) => c.contains('don vi') || c.contains('dvt'));

    List<MobileOcrTableTask> tasks = [];
    int romanCounter = 0;
    String currentSection = '';

    for (int i = headerIndex + 1; i < rows.length; i++) {
      final cells = rows[i];
      if (cells.isEmpty) continue;
      
      String stt = sttCol >= 0 && sttCol < cells.length ? cells[sttCol].trim() : '';
      String name = nameCol >= 0 && nameCol < cells.length ? cells[nameCol].trim() : '';
      if (name.isEmpty) continue;
      
      String nameLookup = _normalizeLookupText(name);
      if (nameLookup.contains('tong cong') || nameLookup == 'cong' || nameLookup.contains('bang chi tiet') || nameLookup.contains('gia tri hop dong')) {
        continue;
      }
      
      double volume = volumeCol >= 0 && volumeCol < cells.length ? _parseNumberValue(cells[volumeCol]) : 0;
      String unit = unitCol >= 0 && unitCol < cells.length ? cells[unitCol].trim() : '';

      String sttLookup = _normalizeLookupText(stt).toUpperCase();
      
      bool isRoman = RegExp(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\s+[A-Z0-9]+)$').hasMatch(sttLookup);
      bool isNumericParent = RegExp(r'^\d+$').hasMatch(sttLookup);
      bool isDecimalItem = RegExp(r'^\d+(?:\.\d+)+$').hasMatch(sttLookup);
      
      bool hasValidStt = isRoman || isNumericParent || isDecimalItem;
      if (!hasValidStt) continue;

      bool isSectionHeader = isRoman || (isNumericParent && volume == 0);
      
      if (isSectionHeader) currentSection = name;

      tasks.add(MobileOcrTableTask(
        stt: isSectionHeader ? 'MUC_$romanCounter' : stt,
        name: name,
        volume: isSectionHeader ? 0 : volume,
        unit: isSectionHeader ? '' : unit,
        notes: '',
        isSectionHeader: isSectionHeader,
        sectionName: currentSection,
        supplyScope: 'contractor',
      ));
      if (isSectionHeader) romanCounter++;
    }
    return tasks;
  }

  static void _pushField(List<MobileOcrField> fields, String label, String value) {
    if (value.trim().isEmpty) return;
    fields.add(MobileOcrField(label: label, value: value.trim()));
  }

  static String _getFirstMatch(String text, List<RegExp> patterns) {
    for (var pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null && match.groupCount >= 1) {
        return match.group(1) ?? match.group(0) ?? '';
      } else if (match != null) {
        return match.group(0) ?? '';
      }
    }
    return '';
  }

  static MobileOcrExtractedData extractDataFromText(String rawText) {
    final lines = rawText.split('\n').map((l) => _compactSpaces(l)).where((l) => l.isNotEmpty).toList();
    final flatText = rawText.replaceAll('\n', ' ');
    
    final projectName = _getLineAfterLabel(lines, ['Công trình', 'Tên công trình', 'Dự án', 'Gói thầu']);
    final location = _getLineAfterLabel(lines, ['Địa điểm công trình', 'Địa điểm xây dựng', 'Vị trí công trình', 'Địa điểm', 'Vị trí']);
    final client = _getLineAfterLabel(lines, ['Chủ đầu tư', 'Khách hàng', 'Bên A']);
    final taskName = _getLineAfterLabel(lines, ['Nội dung công việc', 'Công việc', 'Yêu cầu']);
    
    String dueDate = _getLineAfterLabel(lines, ['Hạn hoàn thành', 'Ngày giao', 'Ngày hẹn', 'Deadline', 'Ngày']);
    if (dueDate.isEmpty) {
      dueDate = _getFirstMatch(flatText, [RegExp(r'\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b')]);
    }
    
    final quantity = _getLineAfterLabel(lines, ['Số lượng', 'Khối lượng', 'SL']);
    final unit = _getLineAfterLabel(lines, ['Đơn vị', 'DVT', 'ĐVT']);
    final note = _getLineAfterLabel(lines, ['Ghi chú', 'Mô tả']);
    final phone = _getFirstMatch(flatText, [RegExp(r'\b((?:0|\+84)[0-9 .-]{8,13})\b')]);

    final tableTasks = _parseTableTasks(lines);

    List<MobileOcrField> fields = [];
    _pushField(fields, 'Dự án/Công trình', projectName);
    _pushField(fields, 'Địa điểm công trình', location);
    _pushField(fields, 'Chủ đầu tư', client);
    _pushField(fields, 'Công việc', taskName);
    _pushField(fields, 'Khối lượng', quantity);
    _pushField(fields, 'Đơn vị', unit);
    _pushField(fields, 'Hạn/Ngày', dueDate);
    _pushField(fields, 'Số điện thoại', phone);
    _pushField(fields, 'Ghi chú', note);
    if (tableTasks.isNotEmpty) {
      _pushField(fields, 'Đầu mục trong bảng', '${tableTasks.length} đầu mục sẽ import vào tab Công việc');
    }

    return MobileOcrExtractedData(
      fields: fields,
      tableTasks: tableTasks,
      projectName: projectName,
      location: location,
      client: client,
      rawText: rawText,
    );
  }

  static Future<MobileOcrExtractedData> processImage(File file) async {
    final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
    final inputImage = InputImage.fromFile(file);
    final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
    await textRecognizer.close();
    
    return extractDataFromText(recognizedText.text);
  }

  static Future<MobileOcrExtractedData> processExcel(File file) async {
    var bytes = file.readAsBytesSync();
    var excel = Excel.decodeBytes(bytes);
    
    List<String> lines = [];
    for (var table in excel.tables.keys) {
      lines.add('Sheet: $table');
      for (var row in excel.tables[table]!.rows) {
        final rowValues = row.map((e) => e?.value?.toString() ?? '').join('\t');
        lines.add(rowValues);
      }
    }
    
    return extractDataFromText(lines.join('\n'));
  }

  static Future<MobileOcrExtractedData> processCsv(File file) async {
    final input = await file.readAsString();
    final List<List<dynamic>> rows = Csv().decode(input);
    
    List<String> lines = rows.map((row) => row.join('\t')).toList();
    return extractDataFromText(lines.join('\n'));
  }

  static Future<MobileOcrExtractedData> processFile(File file) async {
    final path = file.path.toLowerCase();
    if (path.endsWith('.xlsx') || path.endsWith('.xls')) {
      return processExcel(file);
    } else if (path.endsWith('.csv')) {
      return processCsv(file);
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
      return processImage(file);
    }
    
    throw Exception('Định dạng file không được hỗ trợ');
  }
}
