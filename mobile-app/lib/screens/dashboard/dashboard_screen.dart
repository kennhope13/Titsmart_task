import 'package:flutter/material.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: const Icon(Icons.grid_view, color: Color(0xFF00236F), size: 20),
            ),
            const SizedBox(width: 12),
            const Text(
              'TỔNG QUAN',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w900,
                fontSize: 18,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF00236F),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF00236F),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: 'Tài Chính'),
            Tab(text: 'Tiến Độ'),
            Tab(text: 'Vật Tư'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildFinanceTab(),
          _buildProgressTab(),
          _buildMaterialTab(),
        ],
      ),
    );
  }

  Widget _buildFinanceTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionTitle('Cơ Cấu Chi Phí'),
        _buildDummyChartBox('Biểu đồ Tròn (Cơ cấu)'),
        const SizedBox(height: 16),
        _buildSectionTitle('Dòng Tiền Thu/Chi (Q1-Q4)'),
        _buildDummyChartBox('Biểu đồ Cột (Dòng tiền)'),
      ],
    );
  }

  Widget _buildProgressTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionTitle('Tiến Độ Dự Án (%)'),
        _buildDummyChartBox('Biểu đồ Đường (Tiến độ)'),
        const SizedBox(height: 16),
        _buildSectionTitle('Tải Công Việc Kỹ Sư'),
        _buildDummyChartBox('Biểu đồ Cột (Tải CV)'),
      ],
    );
  }

  Widget _buildMaterialTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionTitle('Tồn Kho Vật Tư'),
        _buildDummyChartBox('Biểu đồ Cột Ngang (Tồn kho)'),
        const SizedBox(height: 16),
        _buildSectionTitle('Tiêu Hao Theo Dự Án'),
        _buildDummyChartBox('Biểu đồ Cột (Tiêu hao)'),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 14,
          color: Color(0xFF475569),
        ),
      ),
    );
  }

  Widget _buildDummyChartBox(String label) {
    return Container(
      height: 250,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.bar_chart, size: 48, color: Colors.grey),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
