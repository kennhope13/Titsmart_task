class ProjectPurchasing {
  final String id;
  final String parentId;
  final bool isSec;
  String stt;
  String content;
  String unit;
  double volumeContract;
  double volumeOrder;
  double unitPrice;
  double vatRate;
  double vatAmount;
  double totalAmount;
  String orderStatus;
  String contractStatus;
  double prepayPercent; // 0.0 to 1.0
  double prepayAmount;
  double remainingAmount;
  String paymentDate;
  String invoiceStatus;
  String notes;

  ProjectPurchasing({
    required this.id,
    this.parentId = '',
    this.isSec = false,
    this.stt = '',
    required this.content,
    this.unit = '',
    this.volumeContract = 0.0,
    this.volumeOrder = 0.0,
    this.unitPrice = 0.0,
    this.vatRate = 0.0,
    this.vatAmount = 0.0,
    this.totalAmount = 0.0,
    this.orderStatus = '',
    this.contractStatus = '',
    this.prepayPercent = 0.0,
    this.prepayAmount = 0.0,
    this.remainingAmount = 0.0,
    this.paymentDate = '',
    this.invoiceStatus = '',
    this.notes = '',
  });

  ProjectPurchasing copyWith({
    String? stt,
    String? content,
    String? unit,
    double? volumeContract,
    double? volumeOrder,
    double? unitPrice,
    double? vatRate,
    double? vatAmount,
    double? totalAmount,
    String? orderStatus,
    String? contractStatus,
    double? prepayPercent,
    double? prepayAmount,
    double? remainingAmount,
    String? paymentDate,
    String? invoiceStatus,
    String? notes,
  }) {
    return ProjectPurchasing(
      id: id,
      parentId: parentId,
      isSec: isSec,
      stt: stt ?? this.stt,
      content: content ?? this.content,
      unit: unit ?? this.unit,
      volumeContract: volumeContract ?? this.volumeContract,
      volumeOrder: volumeOrder ?? this.volumeOrder,
      unitPrice: unitPrice ?? this.unitPrice,
      vatRate: vatRate ?? this.vatRate,
      vatAmount: vatAmount ?? this.vatAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      orderStatus: orderStatus ?? this.orderStatus,
      contractStatus: contractStatus ?? this.contractStatus,
      prepayPercent: prepayPercent ?? this.prepayPercent,
      prepayAmount: prepayAmount ?? this.prepayAmount,
      remainingAmount: remainingAmount ?? this.remainingAmount,
      paymentDate: paymentDate ?? this.paymentDate,
      invoiceStatus: invoiceStatus ?? this.invoiceStatus,
      notes: notes ?? this.notes,
    );
  }
}
