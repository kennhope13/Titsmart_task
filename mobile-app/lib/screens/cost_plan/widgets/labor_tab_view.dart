import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/labor_payroll.dart';

class LaborTabView extends StatefulWidget {
  final List<LaborPayroll> items;

  const LaborTabView({super.key, required this.items});

  @override
  State<LaborTabView> createState() => _LaborTabViewState();
}

class _LaborTabViewState extends State<LaborTabView> {
  late List<LaborPayroll> _items;
  String _searchQuery = '';
  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  @override
  void initState() {
    super.initState();
    _items = List.from(widget.items);
  }

  void _handleDelete(String id) {
    setState(() {
      _items.removeWhere((i) => i.id == id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final filteredItems = _items.where((item) {
      final q = _searchQuery.toLowerCase();
      if (q.isEmpty) return true;
      return item.workerName.toLowerCase().contains(q) || item.content.toLowerCase().contains(q) || item.description.toLowerCase().contains(q);
    }).toList();

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
                    hintText: 'Tìm kiếm nhân công...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    fillColor: Colors.white,
                    filled: true,
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val),
                ),
              ),
            ],
          ),
        ),
        
        // List View
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: filteredItems.length,
            itemBuilder: (context, index) {
              final item = filteredItems[index];
              return _buildCard(item);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCard(LaborPayroll item) {
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
          // Header
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
                      Text(item.workerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
                      if (item.content.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(item.content, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ]
                    ],
                  ),
                ),
                Text(item.date, style: const TextStyle(fontSize: 11, color: Colors.grey)),
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
                    Expanded(child: _buildInfoItem('Số công', '${item.quantity} ${item.unit}')),
                    Expanded(child: _buildInfoItem('Đơn giá', _currencyFormat.format(item.unitPrice))),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Thành tiền', _currencyFormat.format(item.totalAmount), isBold: true, color: Colors.blue)),
                    Expanded(child: _buildInfoItem('Tài khoản', item.bankAccount.isNotEmpty ? item.bankAccount : 'Tiền mặt', color: Colors.green)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('TT Thanh toán', item.paymentStatus, color: item.paymentStatus.contains('Chưa') ? Colors.orange : Colors.green)),
                  ],
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
        Text(value, style: TextStyle(fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: color ?? Colors.black87), maxLines: 1, overflow: TextOverflow.ellipsis),
      ],
    );
  }
}
