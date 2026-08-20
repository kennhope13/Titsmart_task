import 'package:flutter/material.dart';
import '../../models/project_material_plan.dart';
import '../../models/project_purchasing.dart';
import '../../models/labor_payroll.dart';
import '../../models/project_expense.dart';
import 'widgets/material_plan_tab_view.dart';
import 'widgets/purchasing_tab_view.dart';
import 'widgets/labor_tab_view.dart';
import 'widgets/expense_tab_view.dart';

class CostPlanScreen extends StatefulWidget {
  const CostPlanScreen({super.key});

  @override
  State<CostPlanScreen> createState() => _CostPlanScreenState();
}

class _CostPlanScreenState extends State<CostPlanScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedProject = 'Dự án A';

  final List<String> _projects = ['Dự án A', 'Dự án B', 'Dự án C'];

  // Dummy Material Plan Data
  final List<ProjectMaterialPlan> _materialPlans = [
    ProjectMaterialPlan(id: 's1', isSec: true, stt: 'I', jobContent: 'THIẾT BỊ CHO CHỮA CHÁY'),
    ProjectMaterialPlan(
      id: 'm1', stt: '1', parentId: 's1', jobContent: 'Máy bơm diesel Q=54m3/h', unit: 'cái', contractVolume: 1, 
      techSpecModel: 'Huyndai', techSpecOrigin: 'Hàn Quốc', techSpecStatus: 'Đang xem xét', progressStatus: 0.1,
      orderedVolume: 1, orderedStatus: 'Đã đặt hàng', expectedDate: '15/09/2026', docCo: true, docCq: false
    ),
    ProjectMaterialPlan(
      id: 'm2', stt: '2', parentId: 's1', jobContent: 'Tủ điều khiển hệ thống bơm', unit: 'tủ', contractVolume: 1, 
      techSpecModel: 'VN', techSpecOrigin: 'Việt Nam', techSpecStatus: 'Đáp ứng', progressStatus: 0.8,
      orderedVolume: 1, orderedStatus: 'Đã nhận hàng', expectedDate: '01/09/2026', docCo: true, docCq: true, dispatchToSite: true, dispatchDate: '05/09/2026'
    ),
    ProjectMaterialPlan(id: 's2', isSec: true, stt: 'II', jobContent: 'HỆ THỐNG ỐNG VÀ PHỤ KIỆN'),
    ProjectMaterialPlan(
      id: 'm3', stt: '1', parentId: 's2', jobContent: 'Ống thép mạ kẽm D100', unit: 'ống', contractVolume: 150, 
      techSpecModel: 'Hòa Phát', techSpecOrigin: 'Việt Nam', techSpecStatus: 'Đáp ứng', progressStatus: 0.5,
      orderedVolume: 100, orderedStatus: 'Đang giao hàng', docCo: false, docCq: false
    ),
  ];

  // Dummy Purchasing Data
  final List<ProjectPurchasing> _purchasingPlans = [
    ProjectPurchasing(id: 'ps1', isSec: true, stt: 'I', content: 'HỢP ĐỒNG CUNG CẤP THIẾT BỊ'),
    ProjectPurchasing(
      id: 'p1', stt: '1', parentId: 'ps1', content: 'HĐ Mua máy bơm', unit: 'HĐ', 
      volumeContract: 1, volumeOrder: 1, unitPrice: 250000000, vatRate: 8, vatAmount: 20000000, totalAmount: 270000000,
      orderStatus: 'Đã đặt hàng', contractStatus: 'Đã ký', prepayPercent: 0.3, prepayAmount: 81000000, invoiceStatus: 'Đã xuất'
    ),
    ProjectPurchasing(id: 'ps2', isSec: true, stt: 'II', content: 'HỢP ĐỒNG MUA VẬT TƯ CHÍNH'),
    ProjectPurchasing(
      id: 'p2', stt: '1', parentId: 'ps2', content: 'HĐ Mua ống thép Hòa Phát', unit: 'HĐ', 
      volumeContract: 1, volumeOrder: 1, unitPrice: 150000000, vatRate: 10, vatAmount: 15000000, totalAmount: 165000000,
      orderStatus: 'Đang giao hàng', contractStatus: 'Đã ký', prepayPercent: 0.5, prepayAmount: 82500000, invoiceStatus: 'Đang kiểm tra'
    ),
  ];

  // Dummy Labor Data
  final List<LaborPayroll> _laborPlans = [
    LaborPayroll(
      id: 'l1', stt: '1', date: '10/08/2026', workerName: 'Nguyễn Văn A', content: 'Lắp ống trục đứng',
      unit: 'công', quantity: 10, unitPrice: 400000, totalAmount: 4000000, paymentStatus: 'Chưa thanh toán'
    ),
    LaborPayroll(
      id: 'l2', stt: '2', date: '05/08/2026', workerName: 'Trần Thị B', content: 'Kéo cáp',
      unit: 'công', quantity: 5, unitPrice: 350000, totalAmount: 1750000, paymentStatus: 'Đã thanh toán', bankAccount: '123456789 - VCB'
    ),
  ];

  // Dummy Expense Data
  final List<ProjectExpense> _expensePlans = [
    ProjectExpense(
      id: 'e1', stt: '1', date: '02/08/2026', content: 'Mua máy khoan tay', description: 'Trang bị cho đội thi công',
      unit: 'cái', quantity: 2, unitPrice: 1500000, taxAmount: 150000, totalAmount: 3150000, balanceFund: 10000000
    ),
    ProjectExpense(
      id: 'e2', stt: '2', date: '08/08/2026', content: 'Chi phí tiếp khách', description: 'Gặp gỡ CĐT',
      unit: 'lần', quantity: 1, unitPrice: 2000000, taxAmount: 200000, totalAmount: 2200000, balanceFund: 7800000
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'KẾ HOẠCH & CHI PHÍ', 
              style: TextStyle(
                color: Color(0xFF00236F), 
                fontWeight: FontWeight.w900, 
                fontSize: 16,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 2),
            // Project Dropdown inside AppBar title area to save vertical space
            Row(
              children: [
                const Text('Dự án:', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(width: 4),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedProject,
                    isDense: true,
                    icon: const Icon(Icons.arrow_drop_down, size: 16),
                    style: const TextStyle(color: Colors.black87, fontSize: 13, fontWeight: FontWeight.bold),
                    items: _projects.map((p) => DropdownMenuItem(value: p, child: Text(p, maxLines: 1, overflow: TextOverflow.ellipsis))).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedProject = val);
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.black87),
            onSelected: (value) {
              // Handle Excel import/export
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'import',
                child: Row(children: const [Icon(Icons.upload_file, size: 18), SizedBox(width: 8), Text('Nhập Excel')]),
              ),
              PopupMenuItem(
                value: 'export',
                child: Row(children: const [Icon(Icons.download, size: 18), SizedBox(width: 8), Text('Xuất Excel')]),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: const Color(0xFF00236F),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF00236F),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(icon: Icon(Icons.list_alt, size: 20), text: 'Vật tư', iconMargin: EdgeInsets.only(bottom: 4)),
            Tab(icon: Icon(Icons.shopping_bag_outlined, size: 20), text: 'Mua hàng', iconMargin: EdgeInsets.only(bottom: 4)),
            Tab(icon: Icon(Icons.receipt_long, size: 20), text: 'Chi phí', iconMargin: EdgeInsets.only(bottom: 4)),
            Tab(icon: Icon(Icons.people_outline, size: 20), text: 'Nhân công', iconMargin: EdgeInsets.only(bottom: 4)),
            Tab(icon: Icon(Icons.description_outlined, size: 20), text: 'Chứng từ', iconMargin: EdgeInsets.only(bottom: 4)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          MaterialPlanTabView(items: _materialPlans),
          PurchasingTabView(items: _purchasingPlans),
          ExpenseTabView(items: _expensePlans),
          LaborTabView(items: _laborPlans),
          const Center(child: Text('Chưa có dữ liệu theo dõi chứng từ')),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('TỔNG QUAN TÀI CHÍNH & VẬN HÀNH', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87)),
          const SizedBox(height: 16),
          _buildMetricCard(Icons.account_balance_wallet, 'Tổng chi phí thực tế', '1,250,000,000 đ', Colors.blue),
          const SizedBox(height: 12),
          _buildMetricCard(Icons.shopping_cart, 'Tổng giá trị HĐ mua sắm', '850,000,000 đ', Colors.indigo, subText: 'Còn lại: 150,000,000 đ'),
          const SizedBox(height: 12),
          _buildMetricCard(Icons.payments, 'Chi phí & Lương', '400,000,000 đ', Colors.teal, subText: 'CP: 150tr | Lương: 250tr'),
          const SizedBox(height: 12),
          _buildProgressCard(),
        ],
      ),
    );
  }

  Widget _buildMetricCard(IconData icon, String title, String value, MaterialColor color, {String? subText}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.shade50, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color.shade600),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.black87)),
                if (subText != null) ...[
                  const SizedBox(height: 4),
                  Text(subText, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ]
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildProgressCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.inventory_2, color: Colors.amber.shade600),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Vật tư thi công', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 4),
                const Text('120 / 150', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.black87)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: 120/150,
                    backgroundColor: Colors.grey.shade200,
                    color: Colors.amber,
                    minHeight: 6,
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
