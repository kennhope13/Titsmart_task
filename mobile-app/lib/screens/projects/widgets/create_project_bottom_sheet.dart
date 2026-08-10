import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import '../../../services/mobile_ocr_service.dart';

class CreateProjectBottomSheet extends StatefulWidget {
  final Function(String name, String code, String location, String client)? onProjectCreated;

  const CreateProjectBottomSheet({super.key, this.onProjectCreated});

  @override
  State<CreateProjectBottomSheet> createState() => _CreateProjectBottomSheetState();
}

class _CreateProjectBottomSheetState extends State<CreateProjectBottomSheet> {
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _locationController = TextEditingController();
  final _clientController = TextEditingController();
  final _contractValueController = TextEditingController();

  bool _isProcessing = false;
  int _pendingTasksCount = 0;
  File? _selectedFile;
  MobileOcrExtractedData? _extractedData;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'xls', 'csv', 'jpg', 'jpeg', 'png'],
    );
    if (result != null && result.files.single.path != null) {
      setState(() {
        _selectedFile = File(result.files.single.path!);
        _extractedData = null;
      });
    }
  }

  String _generateProjectCode(String name) {
    if (name.isEmpty) return 'PRJ_${DateTime.now().millisecondsSinceEpoch % 1000}';
    
    var withDiacritics = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    var withoutDiacritics = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
    var str = name.toLowerCase();
    for (int i = 0; i < withDiacritics.length; i++) {
      str = str.replaceAll(withDiacritics[i], withoutDiacritics[i]);
    }
    
    str = str.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]+'), '_');
    str = str.replaceAll(RegExp(r'^_+|_+$'), '');
    
    if (str.length > 40) {
      str = str.substring(0, 40);
    }
    
    return str.isEmpty ? 'PRJ_${DateTime.now().millisecondsSinceEpoch % 1000}' : str;
  }

  Future<void> _processFile() async {
    if (_selectedFile == null) return;

    setState(() => _isProcessing = true);

    try {
      final extractedData = await MobileOcrService.processFile(_selectedFile!);
      
      setState(() {
        _extractedData = extractedData;
        if (extractedData.projectName.isNotEmpty) {
          _nameController.text = extractedData.projectName;
          _codeController.text = _generateProjectCode(extractedData.projectName);
        }
        if (extractedData.location.isNotEmpty) {
          _locationController.text = extractedData.location;
        }
        if (extractedData.client.isNotEmpty) {
          _clientController.text = extractedData.client;
        }
        _pendingTasksCount = extractedData.tableTasks.length;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã trích xuất thành công ${_pendingTasksCount} hạng mục công việc!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lỗi khi đọc file: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  String _getFileSizeString(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.post_add, color: Color(0xFF00236F), size: 28),
                    const SizedBox(width: 12),
                    const Text(
                      'Nhập file / Khởi tạo Dự án',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF00236F),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(color: Colors.grey, height: 24),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200, style: BorderStyle.solid, width: 1),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.blue.withOpacity(0.3), width: 1, style: BorderStyle.none),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.upload_file, size: 18, color: Color(0xFF00236F)),
                                      const SizedBox(width: 8),
                                      const Text(
                                        'Nhập từ phụ lục',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: Color(0xFF00236F),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Tải ảnh, Excel/CSV, TXT, DOCX hoặc PDF. OCR chỉ dùng cho ảnh và PDF scan; các file có text sẽ được đọc trực tiếp.',
                                    style: TextStyle(color: Colors.grey, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            Column(
                              children: [
                                OutlinedButton.icon(
                                  onPressed: _isProcessing ? null : _pickFile,
                                  icon: const Icon(Icons.attach_file, size: 16),
                                  label: const Text('Chọn file'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF00236F),
                                    side: const BorderSide(color: Color(0xFF00236F)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    minimumSize: const Size(110, 36),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton.icon(
                                  onPressed: (_isProcessing || _selectedFile == null) ? null : _processFile,
                                  icon: const Icon(Icons.auto_fix_high, size: 16, color: Colors.white),
                                  label: const Text('Đọc file', style: TextStyle(color: Colors.white)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF00236F),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    minimumSize: const Size(110, 36),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                        if (_selectedFile != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade200,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Icon(Icons.insert_drive_file, color: Colors.grey.shade500),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p.basename(_selectedFile!.path),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _getFileSizeString(_selectedFile!.lengthSync()),
                                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        if (_isProcessing)
                          const Padding(
                            padding: EdgeInsets.only(top: 12),
                            child: Row(
                              children: [
                                SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                SizedBox(width: 12),
                                Text('Đang dùng AI trích xuất dữ liệu...', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (_extractedData != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Dữ liệu đã nhận diện và tự động điền vào form',
                                style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF1E293B), fontSize: 13),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Có thể chỉnh lại từng ô trong form, hoặc chọn lại file nếu muốn thay đổi nguồn dữ liệu.',
                                style: TextStyle(color: Colors.grey, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              _selectedFile = null;
                              _extractedData = null;
                              _isProcessing = false;
                            });
                          },
                          icon: const Icon(Icons.refresh, size: 14),
                          label: const Text('Chọn lại', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.black87,
                            side: BorderSide(color: Colors.grey.shade300),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            minimumSize: const Size(80, 32),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_extractedData!.fields.isNotEmpty)
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 2.2,
                        ),
                        itemCount: _extractedData!.fields.length,
                        itemBuilder: (context, index) {
                          final field = _extractedData!.fields[index];
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.grey.shade100),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  field.label.toUpperCase(),
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade400),
                                ),
                                const SizedBox(height: 4),
                                Expanded(
                                  child: Text(
                                    field.value,
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B), fontSize: 12),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Text(
                        'Đã tự động điền dữ liệu vào form. Có thể chỉnh lại từng ô trước khi lưu.',
                        style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            const Text(
              'Có thể nhập file để tự điền thông tin dự án và đầu mục công việc, hoặc nhập thủ công bên dưới.',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 16),
            _buildTextField('Tên Dự án / Công trình mới *', _nameController, true),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField('Mã Dự án', _codeController, false, 'Tự sinh nếu bỏ trống')),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Địa điểm công trình', _locationController, false)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField('Chủ đầu tư', _clientController, false)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Giá trị hợp đồng', _contractValueController, false, '', TextInputType.number)),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Nhân sự / Quản lý dự án',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.red.shade100),
                borderRadius: BorderRadius.circular(4),
                color: Colors.red.shade50.withOpacity(0.1),
              ),
              child: Column(
                children: [
                  _buildCheckboxItem('tiên', 'Nhân viên/Thợ', false),
                  _buildCheckboxItem('tiên', 'Nhân viên/Thợ', false),
                  _buildCheckboxItem('hhhh12', 'Nhân viên/Thợ', false),
                  _buildCheckboxItem('hhhhhhh', 'Nhân viên/Thợ', false),
                  _buildCheckboxItem('tien', 'Nhân viên/Thợ', false),
                  _buildCheckboxItem('Khánh', 'Quản lý', false, isLast: true),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Người đầu tiên được chọn sẽ hiển thị dưới dạng Chỉ huy trưởng chính.',
              style: TextStyle(color: Colors.grey, fontSize: 11),
            ),
            if (_pendingTasksCount > 0) ...[
              const SizedBox(height: 16),
              Text(
                'Khi lưu dự án, hệ thống sẽ đưa $_pendingTasksCount dòng vào tab Công việc và KH Vật tư.',
                style: const TextStyle(color: Color(0xFF007A33), fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  child: const Text('Hủy', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _isProcessing ? null : () {
                    if (_nameController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Vui lòng nhập tên dự án')),
                      );
                      return;
                    }
                    if (widget.onProjectCreated != null) {
                      widget.onProjectCreated!(
                        _nameController.text,
                        _codeController.text,
                        _locationController.text,
                        _clientController.text,
                      );
                    }
                    Navigator.pop(context);
                    
                    String message = _pendingTasksCount > 0 
                      ? 'Đã tạo dự án và import $_pendingTasksCount đầu mục!' 
                      : 'Đã tạo dự án mới: ${_nameController.text}';
                      
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.white, size: 20),
                            const SizedBox(width: 12),
                            Expanded(child: Text(message, style: const TextStyle(fontWeight: FontWeight.bold))),
                          ],
                        ),
                        backgroundColor: const Color(0xFF10B981), // Emerald 500
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        margin: const EdgeInsets.only(bottom: 24, left: 16, right: 16),
                        duration: const Duration(seconds: 3),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00236F),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  child: const Text('Tạo Dự án', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, bool required, [String? hint, TextInputType type = TextInputType.text]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF334155)),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: type,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCheckboxItem(String name, String role, bool isChecked, {bool isLast = false}) {
    return Container(
      decoration: BoxDecoration(
        border: isLast ? null : Border(bottom: BorderSide(color: Colors.red.shade100)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 20,
            height: 20,
            child: Checkbox(
              value: isChecked,
              onChanged: (val) {},
              activeColor: const Color(0xFF00236F),
              side: BorderSide(color: Colors.grey.shade400),
            ),
          ),
          const SizedBox(width: 12),
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B))),
          const SizedBox(width: 8),
          Text('($role)', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
        ],
      ),
    );
  }
}
