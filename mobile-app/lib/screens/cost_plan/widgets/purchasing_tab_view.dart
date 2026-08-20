import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/project_purchasing.dart';

class PurchasingPlanGroup {
  final ProjectPurchasing section;
  final List<ProjectPurchasing> items;
  bool isExpanded;

  PurchasingPlanGroup(this.section, this.items, {this.isExpanded = true});
}

class PurchasingTabView extends StatefulWidget {
  final List<ProjectPurchasing> items;

  const PurchasingTabView({super.key, required this.items});

  @override
  State<PurchasingTabView> createState() => _PurchasingTabViewState();
}

class _PurchasingTabViewState extends State<PurchasingTabView> {
  late List<ProjectPurchasing> _items;
  String _searchQuery = '';
  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
  List<PurchasingPlanGroup> _groups = [];

  @override
  void initState() {
    super.initState();
    _items = List.from(widget.items);
    _buildGroups();
  }

  void _buildGroups() {
    _groups.clear();
    PurchasingPlanGroup? currentGroup;
    
    for (var item in _items) {
      if (item.isSec) {
        currentGroup = PurchasingPlanGroup(item, []);
        _groups.add(currentGroup);
      } else if (currentGroup != null) {
        currentGroup.items.add(item);
      } else {
        currentGroup = PurchasingPlanGroup(ProjectPurchasing(
          id: 'dummy', isSec: true, stt: '', content: 'Khác',
          unit: '', volumeContract: 0, volumeOrder: 0, unitPrice: 0, vatRate: 0, vatAmount: 0, totalAmount: 0,
          orderStatus: '', contractStatus: '', prepayPercent: 0, prepayAmount: 0, invoiceStatus: ''
        ), [item]);
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
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm hợp đồng, hàng hóa...',
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
              final filteredItems = group.items.where((item) {
                final q = _searchQuery.toLowerCase();
                if (q.isEmpty) return true;
                return item.content.toLowerCase().contains(q) || item.notes.toLowerCase().contains(q);
              }).toList();

              if (_searchQuery.isNotEmpty && filteredItems.isEmpty && !group.section.content.toLowerCase().contains(_searchQuery.toLowerCase())) {
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
                              '${group.section.stt.isNotEmpty ? '${group.section.stt}. ' : ''}${group.section.content}',
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

  Widget _buildCard(ProjectPurchasing item) {
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.content, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1E293B))),
                      if (item.notes.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text('GC: ${item.notes}', style: const TextStyle(fontSize: 11, color: Colors.orange)),
                      ]
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          
          // Basic Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('KL Hợp đồng', '${item.volumeContract} ${item.unit}')),
                    Expanded(child: _buildInfoItem('KL Đặt', '${item.volumeOrder} ${item.unit}', isBold: true, color: item.volumeOrder >= item.volumeContract ? Colors.green : Colors.orange)),
                    Expanded(child: _buildInfoItem('Đơn giá', _currencyFormat.format(item.unitPrice))),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Tổng tiền (+VAT)', _currencyFormat.format(item.totalAmount), isBold: true, color: Colors.blue)),
                    Expanded(child: _buildInfoItem('Tạm ứng (${(item.prepayPercent * 100).toInt()}%)', _currencyFormat.format(item.prepayAmount), color: Colors.red)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Còn lại', _currencyFormat.format(item.remainingAmount), isBold: true, color: Colors.green)),
                    Expanded(child: _buildInfoItem('Ngày CH', item.paymentDate.isNotEmpty ? item.paymentDate : '-')),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          
          // Status
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: _buildStatusTag('Đặt hàng', item.orderStatus, Colors.blue),
                ),
                Expanded(
                  child: _buildStatusTag('Hợp đồng', item.contractStatus, Colors.green),
                ),
                Expanded(
                  child: _buildStatusTag('Hóa đơn', item.invoiceStatus, Colors.orange),
                ),
              ],
            ),
          ),
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

  Widget _buildInfoItem(String label, String value, {bool isBold = false, Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: color ?? Colors.black87), maxLines: 2, overflow: TextOverflow.ellipsis),
      ],
    );
  }

  Widget _buildStatusTag(String label, String status, MaterialColor color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
          child: Text(status, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

