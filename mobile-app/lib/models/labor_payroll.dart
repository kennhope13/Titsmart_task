class LaborPayroll {
  final String id;
  String stt;
  String date;
  String workerName;
  String content;
  String description;
  String unit;
  double quantity;
  double unitPrice;
  double totalAmount;
  String bankInfo;
  String bankAccount;
  String idCardFrontUrl;
  String idCardBackUrl;
  String paymentStatus;
  String notes;

  LaborPayroll({
    required this.id,
    this.stt = '',
    this.date = '',
    this.workerName = '',
    this.content = '',
    this.description = '',
    this.unit = '',
    this.quantity = 0.0,
    this.unitPrice = 0.0,
    this.totalAmount = 0.0,
    this.bankInfo = '',
    this.bankAccount = '',
    this.idCardFrontUrl = '',
    this.idCardBackUrl = '',
    this.paymentStatus = 'Chưa thanh toán',
    this.notes = '',
  });

  LaborPayroll copyWith({
    String? stt,
    String? date,
    String? workerName,
    String? content,
    String? description,
    String? unit,
    double? quantity,
    double? unitPrice,
    double? totalAmount,
    String? bankInfo,
    String? bankAccount,
    String? idCardFrontUrl,
    String? idCardBackUrl,
    String? paymentStatus,
    String? notes,
  }) {
    return LaborPayroll(
      id: id,
      stt: stt ?? this.stt,
      date: date ?? this.date,
      workerName: workerName ?? this.workerName,
      content: content ?? this.content,
      description: description ?? this.description,
      unit: unit ?? this.unit,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      totalAmount: totalAmount ?? this.totalAmount,
      bankInfo: bankInfo ?? this.bankInfo,
      bankAccount: bankAccount ?? this.bankAccount,
      idCardFrontUrl: idCardFrontUrl ?? this.idCardFrontUrl,
      idCardBackUrl: idCardBackUrl ?? this.idCardBackUrl,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      notes: notes ?? this.notes,
    );
  }
}
