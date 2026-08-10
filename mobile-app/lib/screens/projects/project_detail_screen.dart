import 'package:flutter/material.dart';

class TaskItem {
  final String stt;
  final String content;
  final String volume;
  final String unit;
  final String progress;
  String purchaseStatus;
  String constructionStatus;
  String issue;
  String handle;
  bool isDone;
  String note;

  TaskItem({
    required this.stt,
    required this.content,
    required this.volume,
    required this.unit,
    required this.progress,
    required this.purchaseStatus,
    required this.constructionStatus,
    required this.issue,
    required this.handle,
    required this.isDone,
    required this.note,
  });
}

class TaskGroup {
  final String stt;
  final String name;
  bool isExpanded;
  final List<TaskItem> tasks;

  TaskGroup({
    required this.stt,
    required this.name,
    this.isExpanded = true,
    required this.tasks,
  });
}

class ProjectDetailScreen extends StatefulWidget {
  final String projectCode;
  final String projectName;

  const ProjectDetailScreen({super.key, required this.projectCode, required this.projectName});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final List<TaskGroup> _groups = [
    TaskGroup(
      stt: 'I',
      name: 'THIẾT BỊ CHO CHỮA CHÁY DO NHÀ THẦU CUNG CẤP, VẬN CHUYỂN VÀ LẮP ĐẶT TẠI CÔNG TRƯỜNG',
      tasks: [
        TaskItem(stt: '1', content: 'Máy bơm diesel , Q=54m3/h; H=30mH2O', volume: '1', unit: 'cái', progress: '0%', purchaseStatus: 'Chưa đặt hàng', constructionStatus: 'Chưa thi công', issue: '-', handle: '-', isDone: false, note: '-'),
        TaskItem(stt: '2', content: 'Máy bơm điện , Q=54m3/h; H=30mH2O (đơn giá bao gồm côn...', volume: '1', unit: 'cái', progress: '0%', purchaseStatus: 'Chưa đặt hàng', constructionStatus: 'Chưa thi công', issue: '-', handle: '-', isDone: false, note: '-'),
        TaskItem(stt: '3', content: 'Tủ điều khiển hệ thống bơm điện', volume: '1', unit: 'tủ', progress: '0%', purchaseStatus: 'Chưa đặt hàng', constructionStatus: 'Chưa thi công', issue: '-', handle: '-', isDone: false, note: '-'),
      ],
    ),
    TaskGroup(
      stt: 'II',
      name: 'HỆ THỐNG PHÒNG CHÁY CHỮA CHÁY (CÁC VẬT TƯ PHÒNG CHÁY CHỮA CHÁY VÀ PHỤ KIỆN ĐƯỢC TRÁNG KẼM 2 MẶT VÀ ĐƯỢC SƠN DẦU MÀU ĐỎ)',
      tasks: [
        TaskItem(stt: '1', content: 'Thùng đựng dụng cụ PCCC kích thước 900x400x900', volume: '6', unit: 'Thùng', progress: '0%', purchaseStatus: 'Chưa đặt hàng', constructionStatus: 'Chưa thi công', issue: '-', handle: '-', isDone: false, note: '-'),
        TaskItem(stt: '2', content: 'Bình CO2 loại 05 kg loại xách tay', volume: '4', unit: 'Bình', progress: '0%', purchaseStatus: 'Chưa đặt hàng', constructionStatus: 'Chưa thi công', issue: '-', handle: '-', isDone: false, note: '-'),
      ],
    ),
  ];

  Widget _buildFilterDropdown(String label) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black87)),
          const SizedBox(width: 4),
          const Icon(Icons.keyboard_arrow_down, size: 16, color: Colors.grey),
        ],
      ),
    );
  }

  Widget _buildStatusDropdown(String value, List<String> items, ValueChanged<String?> onChanged) {
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(4),
        color: Colors.white,
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          icon: const Icon(Icons.keyboard_arrow_down, size: 14),
          style: const TextStyle(fontSize: 11, color: Colors.black87),
          items: items.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Quản lý Tiến độ', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16)),
            Text('Dự án: ${widget.projectName}', style: const TextStyle(color: Colors.grey, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
      body: Column(
        children: [
          // Filters Toolbar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Icon(Icons.filter_list, size: 18, color: Colors.grey),
                  const SizedBox(width: 8),
                  const Text('Lọc: ', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  _buildFilterDropdown('Đầu mục'),
                  _buildFilterDropdown('Tiến độ'),
                  _buildFilterDropdown('Mua hàng'),
                  _buildFilterDropdown('Thi công'),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.download, size: 14, color: Colors.green),
                    label: const Text('Xuất', style: TextStyle(color: Colors.green, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.green),
                      backgroundColor: Colors.green.shade50,
                      minimumSize: const Size(60, 32),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // List View
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.only(bottom: 24),
              itemCount: _groups.length,
              itemBuilder: (context, index) {
                final group = _groups[index];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Group Header
                    InkWell(
                      onTap: () {
                        setState(() {
                          group.isExpanded = !group.isExpanded;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(top: 12, bottom: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        color: Colors.white,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(group.isExpanded ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_right, size: 20, color: const Color(0xFF00236F)),
                            const SizedBox(width: 8),
                            const Icon(Icons.folder_open, size: 20, color: Color(0xFF00236F)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${group.stt}. ${group.name}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00236F), fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    // Task Cards
                    if (group.isExpanded)
                      ...group.tasks.map((task) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
                          ],
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header: STT + Content
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(4)),
                                    child: Text(task.stt, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800, fontSize: 12)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(task.content, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1E293B))),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            
                            // Info Grid: KL, ĐVT, %
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              child: Row(
                                children: [
                                  Expanded(child: _buildInfoItem('Khối lượng', '${task.volume} ${task.unit}')),
                                  Expanded(child: _buildInfoItem('Tiến độ', task.progress, isBold: true, color: Colors.blue.shade700)),
                                ],
                              ),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            
                            // Status Dropdowns
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Mua hàng', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                        const SizedBox(height: 4),
                                        _buildStatusDropdown(task.purchaseStatus, ['Chưa đặt hàng', 'Đang đặt hàng', 'Đã đặt hàng'], (val) {
                                          if (val != null) setState(() => task.purchaseStatus = val);
                                        }),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Thi công', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                        const SizedBox(height: 4),
                                        _buildStatusDropdown(task.constructionStatus, ['Chưa thi công', 'Đang thi công', 'Hoàn thành'], (val) {
                                          if (val != null) setState(() => task.constructionStatus = val);
                                        }),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            // Issue, Handle & Note Fields
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              child: Column(
                                children: [
                                  _buildTextField(
                                    label: 'Vướng mắc', 
                                    initialValue: task.issue == '-' ? '' : task.issue,
                                    onChanged: (val) { task.issue = val; },
                                    icon: Icons.warning_amber_rounded,
                                    iconColor: Colors.red.shade400,
                                  ),
                                  const SizedBox(height: 8),
                                  _buildTextField(
                                    label: 'Xử lý', 
                                    initialValue: task.handle == '-' ? '' : task.handle,
                                    onChanged: (val) { task.handle = val; },
                                    icon: Icons.build_circle_outlined,
                                    iconColor: Colors.orange.shade400,
                                  ),
                                  const SizedBox(height: 8),
                                  _buildTextField(
                                    label: 'Ghi chú', 
                                    initialValue: task.note == '-' ? '' : task.note,
                                    onChanged: (val) { task.note = val; },
                                    icon: Icons.notes,
                                    iconColor: Colors.grey.shade400,
                                  ),
                                ],
                              ),
                            ),
                              
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            
                            // Footer: Done Action
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                              child: Row(
                                children: [
                                  Checkbox(
                                    value: task.isDone,
                                    onChanged: (val) { setState(() => task.isDone = val ?? false); },
                                    activeColor: Colors.blue,
                                  ),
                                  const Text('Đánh dấu đã hoàn thành', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, {bool isBold = false, Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: color ?? Colors.black87)),
      ],
    );
  }

  Widget _buildTextField({
    required String label,
    required String initialValue,
    required ValueChanged<String> onChanged,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: TextFormField(
        initialValue: initialValue,
        onChanged: onChanged,
        style: const TextStyle(fontSize: 12),
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          border: InputBorder.none,
          hintText: 'Nhập $label...',
          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 11),
          prefixIcon: Icon(icon, size: 14, color: iconColor),
          prefixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 32),
        ),
      ),
    );
  }
}
