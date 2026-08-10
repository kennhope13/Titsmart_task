import 'package:flutter/material.dart';
import 'widgets/project_card.dart';
import 'widgets/create_project_bottom_sheet.dart';
import 'project_detail_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class ProjectData {
  final String id;
  final String name;
  final String code;
  final String status;
  final int progress;
  final String location;
  final String client;
  final List<String> members;

  ProjectData({
    required this.id,
    required this.name,
    required this.code,
    required this.status,
    required this.progress,
    required this.location,
    required this.client,
    required this.members,
  });
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final List<ProjectData> _projects = [
    ProjectData(
      id: '01',
      name: 'Khu dân cư EcoCity',
      code: 'PRJ_ECO',
      status: 'active',
      progress: 75,
      location: 'Quận 9, TP.HCM',
      client: 'Tập đoàn ABC',
      members: ['An', 'Bình'],
    ),
    ProjectData(
      id: '02',
      name: 'Tòa nhà văn phòng SunTower',
      code: 'PRJ_SUN',
      status: 'completed',
      progress: 100,
      location: 'Quận 1, TP.HCM',
      client: 'Sun Group',
      members: ['Cường'],
    ),
    ProjectData(
      id: '03',
      name: 'Nhà máy thép Vina',
      code: 'PRJ_VINA',
      status: 'on_hold',
      progress: 30,
      location: 'Đồng Nai',
      client: 'VinaSteel',
      members: [],
    ),
  ];

  void _showCreateProjectSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CreateProjectBottomSheet(
        onProjectCreated: (name, code, location, client) {
          setState(() {
            _projects.insert(0, ProjectData(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              name: name,
              code: code.isEmpty ? 'PRJ_NEW' : code,
              status: 'active',
              progress: 0,
              location: location,
              client: client,
              members: [],
            ));
          });
        },
      ),
    );
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
              child: const Icon(Icons.business_center, color: Color(0xFF00236F), size: 20),
            ),
            const SizedBox(width: 12),
            const Text(
              'QUẢN LÝ DỰ ÁN',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w900,
                fontSize: 18,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: const TextField(
                      decoration: InputDecoration(
                        hintText: 'Tìm kiếm dự án...',
                        hintStyle: TextStyle(fontSize: 14),
                        prefixIcon: Icon(Icons.search, size: 20),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.blue.shade100),
                  ),
                  child: Text(
                    '${_projects.length} dự án',
                    style: const TextStyle(color: Color(0xFF00236F), fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _projects.length,
        itemBuilder: (context, index) {
          final p = _projects[index];
          return ProjectCard(
            id: p.id,
            name: p.name,
            code: p.code,
            status: p.status,
            progress: p.progress,
            location: p.location,
            client: p.client,
            members: p.members,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ProjectDetailScreen(
                    projectCode: p.code,
                    projectName: p.name,
                  ),
                ),
              );
            },
            onDelete: () {
              setState(() {
                _projects.removeAt(index);
              });
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateProjectSheet,
        backgroundColor: const Color(0xFF00236F),
        icon: const Icon(Icons.add),
        label: const Text('Tạo Dự Án', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }
}
