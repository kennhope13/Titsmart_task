class ProjectMaterialPlan {
  final String id;
  final String parentId;
  final bool isSec;
  String stt;
  String jobContent;
  String unit;
  double contractVolume;
  
  // Tech
  String techSpecModel;
  String techSpecOrigin;
  String techSpecStatus;
  double progressStatus; // 0.0 to 1.0

  // Order
  double orderedVolume;
  String orderedStatus;
  String expectedDate;
  String issueContent;
  String issueStatus;

  // Docs
  bool docCo;
  bool docCq;
  bool docFireInspection;
  bool dispatchToSite;
  String dispatchDate;

  String notes;

  ProjectMaterialPlan({
    required this.id,
    this.parentId = '',
    this.isSec = false,
    this.stt = '',
    required this.jobContent,
    this.unit = '',
    this.contractVolume = 0.0,
    this.techSpecModel = '',
    this.techSpecOrigin = '',
    this.techSpecStatus = '',
    this.progressStatus = 0.0,
    this.orderedVolume = 0.0,
    this.orderedStatus = '',
    this.expectedDate = '',
    this.issueContent = '',
    this.issueStatus = '',
    this.docCo = false,
    this.docCq = false,
    this.docFireInspection = false,
    this.dispatchToSite = false,
    this.dispatchDate = '',
    this.notes = '',
  });

  ProjectMaterialPlan copyWith({
    String? stt,
    String? jobContent,
    String? unit,
    double? contractVolume,
    String? techSpecModel,
    String? techSpecOrigin,
    String? techSpecStatus,
    double? progressStatus,
    double? orderedVolume,
    String? orderedStatus,
    String? expectedDate,
    String? issueContent,
    String? issueStatus,
    bool? docCo,
    bool? docCq,
    bool? docFireInspection,
    bool? dispatchToSite,
    String? dispatchDate,
    String? notes,
  }) {
    return ProjectMaterialPlan(
      id: id,
      parentId: parentId,
      isSec: isSec,
      stt: stt ?? this.stt,
      jobContent: jobContent ?? this.jobContent,
      unit: unit ?? this.unit,
      contractVolume: contractVolume ?? this.contractVolume,
      techSpecModel: techSpecModel ?? this.techSpecModel,
      techSpecOrigin: techSpecOrigin ?? this.techSpecOrigin,
      techSpecStatus: techSpecStatus ?? this.techSpecStatus,
      progressStatus: progressStatus ?? this.progressStatus,
      orderedVolume: orderedVolume ?? this.orderedVolume,
      orderedStatus: orderedStatus ?? this.orderedStatus,
      expectedDate: expectedDate ?? this.expectedDate,
      issueContent: issueContent ?? this.issueContent,
      issueStatus: issueStatus ?? this.issueStatus,
      docCo: docCo ?? this.docCo,
      docCq: docCq ?? this.docCq,
      docFireInspection: docFireInspection ?? this.docFireInspection,
      dispatchToSite: dispatchToSite ?? this.dispatchToSite,
      dispatchDate: dispatchDate ?? this.dispatchDate,
      notes: notes ?? this.notes,
    );
  }
}
