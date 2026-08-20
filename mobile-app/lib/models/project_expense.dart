class ProjectExpense {
  final String id;
  String stt;
  String date;
  String content;
  String description;
  String unit;
  double quantity;
  double unitPrice;
  double taxAmount;
  double totalAmount;
  double incomeAmount;
  double balanceFund;
  String invoiceUrl;
  String notes;

  ProjectExpense({
    required this.id,
    this.stt = '',
    this.date = '',
    this.content = '',
    this.description = '',
    this.unit = '',
    this.quantity = 0.0,
    this.unitPrice = 0.0,
    this.taxAmount = 0.0,
    this.totalAmount = 0.0,
    this.incomeAmount = 0.0,
    this.balanceFund = 0.0,
    this.invoiceUrl = '',
    this.notes = '',
  });

  ProjectExpense copyWith({
    String? stt,
    String? date,
    String? content,
    String? description,
    String? unit,
    double? quantity,
    double? unitPrice,
    double? taxAmount,
    double? totalAmount,
    double? incomeAmount,
    double? balanceFund,
    String? invoiceUrl,
    String? notes,
  }) {
    return ProjectExpense(
      id: id,
      stt: stt ?? this.stt,
      date: date ?? this.date,
      content: content ?? this.content,
      description: description ?? this.description,
      unit: unit ?? this.unit,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      taxAmount: taxAmount ?? this.taxAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      incomeAmount: incomeAmount ?? this.incomeAmount,
      balanceFund: balanceFund ?? this.balanceFund,
      invoiceUrl: invoiceUrl ?? this.invoiceUrl,
      notes: notes ?? this.notes,
    );
  }
}
