import 'package:flutter/material.dart';

class AppDataTable<T> extends StatelessWidget {
  final List<T> items;
  final List<DataColumn> stickyColumns;
  final List<DataRow> Function(List<T> items) buildStickyRows;
  final List<DataColumn> scrollableColumns;
  final List<DataRow> Function(List<T> items) buildScrollableRows;
  final double rowHeight;
  final double headingRowHeight;
  final Widget? header;

  const AppDataTable({
    super.key,
    required this.items,
    required this.stickyColumns,
    required this.buildStickyRows,
    required this.scrollableColumns,
    required this.buildScrollableRows,
    this.rowHeight = 60,
    this.headingRowHeight = 56,
    this.header,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Column(
        children: [
          if (header != null) header!,
          const Expanded(
            child: Center(
              child: Text('Không có dữ liệu'),
            ),
          ),
        ],
      );
    }

    final stickyRows = buildStickyRows(items);
    final scrollableRows = buildScrollableRows(items);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (header != null) header!,
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.vertical,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Cột cố định (Sticky Columns)
                Material(
                  elevation: 4,
                  shadowColor: Colors.black26,
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.black12),
                    child: DataTable(
                      headingRowColor: WidgetStateProperty.all(Colors.grey[100]),
                      dataRowMinHeight: rowHeight,
                      dataRowMaxHeight: rowHeight,
                      headingRowHeight: headingRowHeight,
                      horizontalMargin: 8,
                      columnSpacing: 8,
                      columns: stickyColumns,
                      rows: stickyRows,
                    ),
                  ),
                ),
                // Các cột cuộn ngang (Scrollable Columns)
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.black12),
                      child: DataTable(
                        headingRowColor: WidgetStateProperty.all(Colors.grey[50]),
                        dataRowMinHeight: rowHeight,
                        dataRowMaxHeight: rowHeight,
                        headingRowHeight: headingRowHeight,
                        horizontalMargin: 12,
                        columnSpacing: 16,
                        columns: scrollableColumns,
                        rows: scrollableRows,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
