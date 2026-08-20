import 'package:flutter/material.dart';
import '../../../models/project_material_plan.dart';

class MaterialPlanGroup {
  final ProjectMaterialPlan section;
  final List<ProjectMaterialPlan> items;
  bool isExpanded;

  MaterialPlanGroup(this.section, this.items, {this.isExpanded = true});
}

class MaterialPlanTabView extends StatefulWidget {
  final List<ProjectMaterialPlan> items;

  const MaterialPlanTabView({super.key, required this.items});

  @override
  State<MaterialPlanTabView> createState() => _MaterialPlanTabViewState();
}

class _MaterialPlanTabViewState extends State<MaterialPlanTabView> {
  late List<ProjectMaterialPlan> _items;
  String _searchQuery = '';
  String _subTab = 'TECH'; // TECH, ORDER, DOCS
  List<MaterialPlanGroup> _groups = [];

  @override
  void initState() {
    super.initState();
    _items = List.from(widget.items);
    _buildGroups();
  }

  void _buildGroups() {
    _groups.clear();
    MaterialPlanGroup? currentGroup;
    
    for (var item in _items) {
      if (item.isSec) {
        currentGroup = MaterialPlanGroup(item, []);
        _groups.add(currentGroup);
      } else if (currentGroup != null) {
        currentGroup.items.add(item);
      } else {
        // If there's no section, create a dummy one
        currentGroup = MaterialPlanGroup(ProjectMaterialPlan(id: 'dummy', isSec: true, stt: '', jobContent: 'Khác'), [item]);
        _groups.add(currentGroup);
      }
    }
  }

  void _handleDelete(String id) {
    setState(() {
      _items.removeWhere((i) => i.id == id);
      _buildGroups();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Toolbar
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm vật tư, thiết bị...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  fillColor: Colors.white,
                  filled: true,
                ),
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildSubTabButton('TECH', 'Kỹ thuật & Tiến độ'),
                    const SizedBox(width: 8),
                    _buildSubTabButton('ORDER', 'Đặt hàng & Vướng mắc'),
                    const SizedBox(width: 8),
                    _buildSubTabButton('DOCS', 'Chứng từ & Giao hàng'),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // List View
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: _groups.length,
            itemBuilder: (context, index) {
              final group = _groups[index];
              // Filter items inside the group
              final filteredItems = group.items.where((item) {
                final q = _searchQuery.toLowerCase();
                if (q.isEmpty) return true;
                return item.jobContent.toLowerCase().contains(q) || item.notes.toLowerCase().contains(q);
              }).toList();

              if (_searchQuery.isNotEmpty && filteredItems.isEmpty && !group.section.jobContent.toLowerCase().contains(_searchQuery.toLowerCase())) {
                return const SizedBox.shrink();
              }

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
                      margin: const EdgeInsets.only(top: 8, bottom: 4),
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
                              '${group.section.stt.isNotEmpty ? '${group.section.stt}. ' : ''}${group.section.jobContent}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00236F), fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  // Task Cards
                  if (group.isExpanded)
                    ...filteredItems.map((item) => _buildCard(item)),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCard(ProjectMaterialPlan item) {
    return Container(
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
                  child: Text(item.stt, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800, fontSize: 12)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(item.jobContent, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1E293B))),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          
          // Card Body based on SubTab
          _buildCardBody(item),
          
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          
          // Footer Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.edit, size: 16, color: Colors.blue),
                  label: const Text('Sửa', style: TextStyle(color: Colors.blue, fontSize: 12)),
                ),
                TextButton.icon(
                  onPressed: () => _handleDelete(item.id),
                  icon: const Icon(Icons.delete, size: 16, color: Colors.red),
                  label: const Text('Xóa', style: TextStyle(color: Colors.red, fontSize: 12)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBody(ProjectMaterialPlan item) {
    if (_subTab == 'TECH') {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: _buildInfoItem('Khối lượng HĐ', '${item.contractVolume} ${item.unit}')),
                Expanded(child: _buildInfoItem('Tiến độ', '${(item.progressStatus * 100).toInt()}%', isBold: true, color: item.progressStatus == 1 ? Colors.green : Colors.blue)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildInfoItem('Chào hàng (Model)', item.techSpecModel)),
                Expanded(child: _buildInfoItem('Đáp ứng KT (Xuất xứ)', item.techSpecOrigin)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildInfoItem('Tình trạng', item.techSpecStatus, color: Colors.orange.shade700)),
                Expanded(child: _buildInfoItem('Ghi chú', item.notes.isNotEmpty ? item.notes : '-')),
              ],
            ),
          ],
        ),
      );
    } else if (_subTab == 'ORDER') {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: _buildInfoItem('Khối lượng HĐ', '${item.contractVolume} ${item.unit}')),
                Expanded(child: _buildInfoItem('Khối lượng Đặt', '${item.orderedVolume} ${item.unit}', isBold: true, color: Colors.blue)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildInfoItem('Tình trạng ĐH', item.orderedStatus, color: Colors.indigo)),
                Expanded(child: _buildInfoItem('Ngày dự kiến', item.expectedDate)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildInfoItem('Vướng mắc', item.issueContent.isNotEmpty ? item.issueContent : '-', color: Colors.red)),
                Expanded(child: _buildInfoItem('Tình trạng xử lý', item.issueStatus.isNotEmpty ? item.issueStatus : '-', color: Colors.orange)),
              ],
            ),
          ],
        ),
      );
    } else {
      // DOCS
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCheckItem('CO', item.docCo),
                _buildCheckItem('CQ', item.docCq),
                _buildCheckItem('PCCC', item.docFireInspection),
                _buildCheckItem('Gửi CT', item.dispatchToSite),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildInfoItem('Ngày gửi', item.dispatchDate.isNotEmpty ? item.dispatchDate : '-')),
                Expanded(child: _buildInfoItem('Ghi chú', item.notes.isNotEmpty ? item.notes : '-')),
              ],
            ),
          ],
        ),
      );
    }
  }

  Widget _buildCheckItem(String label, bool isChecked) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Icon(isChecked ? Icons.check_circle : Icons.cancel, color: isChecked ? Colors.green : Colors.grey.shade300, size: 24),
      ],
    );
  }

  Widget _buildInfoItem(String label, String value, {bool isBold = false, Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: color ?? Colors.black87), maxLines: 2, overflow: TextOverflow.ellipsis),
      ],
    );
  }

  Widget _buildSubTabButton(String id, String label) {
    final isSelected = _subTab == id;
    return InkWell(
      onTap: () => setState(() => _subTab = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00236F) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF00236F) : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }
}

