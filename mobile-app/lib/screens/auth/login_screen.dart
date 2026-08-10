import 'package:flutter/material.dart';
import '../../widgets/custom_text_field.dart';
import '../main_navigation.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  void _handleLogin() {
    setState(() {
      _isLoading = true;
    });

    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const MainNavigation()),
      );
    });
  }

  Widget _buildExperienceAccount(String role, String id) {
    return GestureDetector(
      onTap: () {
        _emailController.text = id;
        _passwordController.text = '123456'; // Giả lập mật khẩu chung
        _handleLogin();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FA),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Text(role, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(width: 8),
            Text('ID: $id', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const Spacer(),
            const Icon(Icons.arrow_forward_outlined, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9), // Màu nền ngoài thẻ
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: 48,
                      height: 48,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Brand
                  Text(
                    'TITSMART',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.primary,
                      letterSpacing: 1,
                    ),
                  ),
                  Text(
                    'PROJECT MANAGER',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade500,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Tiêu đề
                  Text(
                    'Đăng nhập hệ thống',
                    style: textTheme.titleMedium?.copyWith(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Chào mừng bạn! Vui lòng nhập thông tin để tiếp tục.',
                    style: textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  
                  const Divider(height: 32, thickness: 1, color: Color(0xFFF1F5F9)),

                  // Form
                  CustomTextField(
                    label: 'Tên đăng nhập',
                    hint: 'Nhập tên đăng nhập',
                    controller: _emailController,
                    prefixIcon: const Icon(Icons.person_outline, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Mật khẩu',
                    hint: 'Nhập mật khẩu',
                    isPassword: _obscurePassword,
                    controller: _passwordController,
                    prefixIcon: const Icon(Icons.key_outlined, color: Colors.grey),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: Colors.grey,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Nút đăng nhập
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00236F),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Đăng nhập vào hệ thống', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward, size: 18),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Xem giao diện classic
                  Center(
                    child: TextButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.phone_android_outlined, size: 16, color: Colors.grey),
                      label: const Text('Xem giao diện Classic', style: TextStyle(color: Colors.grey)),
                    ),
                  ),

                  const Divider(height: 32, thickness: 1, color: Color(0xFFF1F5F9)),

                  // Tài khoản trải nghiệm
                  Text(
                    'TÀI KHOẢN TRẢI NGHIỆM',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade500,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildExperienceAccount('Quản trị viên', 'admin'),
                  _buildExperienceAccount('Kỹ sư giám sát', 'kst'),
                  _buildExperienceAccount('Nhân viên', 'nhanvien'),
                  
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      '© 2026 TITSMART Project Manager.',
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 10),
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
