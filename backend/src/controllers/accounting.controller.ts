import { Request, Response } from 'express';
import prisma from '../prismaClient';

// Helper to resolve projectCode to project_id
const resolveProjectId = async (projectCode?: string) => {
  if (!projectCode) return null;
  const project = await prisma.project.findUnique({ where: { code: projectCode } });
  return project ? project.id : null;
};

const formatMaterialPlan = (p: any) => ({
  id: p.id,
  projectId: p.project_id,
  projectCode: p.project?.code || '',
  projectName: p.project?.name || '',
  stt: p.stt,
  jobContent: p.job_content,
  unit: p.unit,
  contractVolume: Number(p.contract_volume),
  techSpecModel: p.tech_spec_model,
  techSpecOrigin: p.tech_spec_origin,
  techSpecStatus: p.tech_spec_status,
  progressStatus: p.progress_status,
  orderedVolume: Number(p.ordered_volume),
  orderedStatus: p.ordered_status,
  expectedDate: p.expected_date,
  issueContent: p.issue_content,
  issueStatus: p.issue_status,
  docCo: p.doc_co,
  docCq: p.doc_cq,
  docStamp: p.doc_stamp,
  docFireInspection: p.doc_fire_inspection,
  dispatchToSite: p.dispatch_to_site,
  dispatchDate: p.dispatch_date,
  notes: p.notes,
  parentId: p.parent_id,
});

const formatPurchasing = (p: any) => ({
  id: p.id,
  projectId: p.project_id,
  projectCode: p.project?.code || '',
  projectName: p.project?.name || '',
  stt: p.stt,
  content: p.content,
  unit: p.unit,
  volumeContract: Number(p.volume_contract),
  volumeOrder: Number(p.volume_order),
  unitPrice: Number(p.unit_price),
  vatRate: Number(p.vat_rate),
  vatAmount: Number(p.vat_amount),
  totalAmount: Number(p.total_amount),
  prepayPercent: Number(p.prepay_percent),
  prepayAmount: Number(p.prepay_amount),
  remainingAmount: Number(p.remaining_amount),
  orderStatus: p.order_status,
  contractStatus: p.contract_status,
  paymentDate: p.payment_date,
  invoiceStatus: p.invoice_status,
  notes: p.notes,
  parentId: p.parent_id,
});

// --- MATERIAL PLANS ---
export const getMaterialPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.projectMaterialPlan.findMany({
      include: { project: true },
      orderBy: [
        { project_id: 'asc' },
        { parent_id: 'asc' },
        { created_at: 'asc' }
      ]
    });
    // NOTE: do NOT sort in-memory here. The DB order (created_at asc) preserves the
    // original Excel layout where each section header is followed by its own items;
    // re-sorting (sections first, then items by numeric stt) breaks that hierarchy
    // and makes the UI group every item under the last section.
    const formatted = plans.map(formatMaterialPlan);
    res.json(formatted);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch material plans' }); }
};

export const createMaterialPlan = async (req: Request, res: Response) => {
  try {
    const { projectCode, jobContent, contractVolume, orderedVolume, expectedDate, dispatchDate, docCO, docCQ, docCo, docCq, docStamp, docFireInspection, dispatchToSite, ...data } = req.body;
    const project_id = await resolveProjectId(projectCode);
    if (!project_id) return res.status(400).json({ error: 'Invalid projectCode' });

    const plan = await prisma.projectMaterialPlan.create({
      data: {
        project_id,
        stt: data.stt,
        job_content: jobContent,
        unit: data.unit || '',
        contract_volume: contractVolume || 0,
        tech_spec_model: data.techSpecModel || '',
        tech_spec_origin: data.techSpecOrigin || '',
        tech_spec_status: data.techSpecStatus || '',
        progress_status: data.progressStatus || '',
        ordered_volume: orderedVolume || 0,
        ordered_status: data.orderedStatus || '',
        expected_date: expectedDate ? new Date(expectedDate) : null,
        issue_content: data.issueContent || '',
        issue_status: data.issueStatus || '',
        doc_co: (docCo !== undefined ? docCo : docCO) || false,
        doc_cq: (docCq !== undefined ? docCq : docCQ) || false,
        doc_stamp: docStamp || false,
        doc_fire_inspection: docFireInspection || false,
        dispatch_to_site: dispatchToSite || false,
        dispatch_date: dispatchDate ? new Date(dispatchDate) : null,
        notes: data.notes || '',
        parent_id: data.parentId || null,
      },
      include: { project: true }
    });
    res.status(201).json(formatMaterialPlan(plan));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create material plan' });
  }
};

export const updateMaterialPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, jobContent, contractVolume, orderedVolume, expectedDate, dispatchDate, docCO, docCQ, docCo, docCq, docStamp, docFireInspection, dispatchToSite, ...data } = req.body;
    
    const updateData: any = {};
    if (jobContent !== undefined) updateData.job_content = jobContent;
    if (contractVolume !== undefined) updateData.contract_volume = contractVolume;
    if (orderedVolume !== undefined) updateData.ordered_volume = orderedVolume;
    if (expectedDate !== undefined) updateData.expected_date = expectedDate ? new Date(expectedDate) : null;
    if (dispatchDate !== undefined) updateData.dispatch_date = dispatchDate ? new Date(dispatchDate) : null;
    const actualDocCo = docCo !== undefined ? docCo : docCO;
    const actualDocCq = docCq !== undefined ? docCq : docCQ;
    if (actualDocCo !== undefined) updateData.doc_co = actualDocCo;
    if (actualDocCq !== undefined) updateData.doc_cq = actualDocCq;
    if (docStamp !== undefined) updateData.doc_stamp = docStamp;
    if (docFireInspection !== undefined) updateData.doc_fire_inspection = docFireInspection;
    if (dispatchToSite !== undefined) updateData.dispatch_to_site = dispatchToSite;
    if (data.stt !== undefined) updateData.stt = data.stt;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.techSpecModel !== undefined) updateData.tech_spec_model = data.techSpecModel;
    if (data.techSpecOrigin !== undefined) updateData.tech_spec_origin = data.techSpecOrigin;
    if (data.techSpecStatus !== undefined) updateData.tech_spec_status = data.techSpecStatus;
    if (data.progressStatus !== undefined) updateData.progress_status = String(data.progressStatus);
    if (data.orderedStatus !== undefined) updateData.ordered_status = data.orderedStatus;
    if (data.issueContent !== undefined) updateData.issue_content = data.issueContent;
    if (data.issueStatus !== undefined) updateData.issue_status = data.issueStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const plan = await prisma.projectMaterialPlan.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    res.json(formatMaterialPlan(plan));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update material plan' });
  }
};

export const deleteMaterialPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.projectMaterialPlan.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete material plan' }); }
};


// --- PURCHASINGS ---
export const getPurchasings = async (req: Request, res: Response) => {
  try {
    const data = await prisma.projectPurchasing.findMany({
      include: { project: true },
      orderBy: { created_at: 'asc' }
    });
    const formatted = data.map(formatPurchasing);
    res.json(formatted);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch purchasings' }); }
};

export const createPurchasing = async (req: Request, res: Response) => {
  try {
    const { projectCode, volumeContract, volumeOrder, unitPrice, vatRate, vatAmount, totalAmount, prepayPercent, prepayAmount, remainingAmount, orderStatus, contractStatus, invoiceStatus, paymentDate, ...data } = req.body;
    const project_id = await resolveProjectId(projectCode);
    if (!project_id) return res.status(400).json({ error: 'Invalid projectCode' });

    const p = await prisma.projectPurchasing.create({
      data: {
        project_id,
        stt: data.stt,
        content: data.content,
        unit: data.unit || '',
        volume_contract: volumeContract || 0,
        volume_order: volumeOrder || 0,
        unit_price: unitPrice || 0,
        vat_rate: vatRate || 0,
        vat_amount: vatAmount || 0,
        total_amount: totalAmount || 0,
        prepay_percent: prepayPercent || 0,
        prepay_amount: prepayAmount || 0,
        remaining_amount: remainingAmount || 0,
        order_status: orderStatus || '',
        contract_status: contractStatus || '',
        payment_date: paymentDate ? new Date(paymentDate) : null,
        invoice_status: invoiceStatus || '',
        notes: data.notes || '',
        parent_id: data.parentId || null,
      },
      include: { project: true }
    });
    res.status(201).json(formatPurchasing(p));
  } catch (error) { res.status(500).json({ error: 'Failed to create purchasing' }); }
};

export const updatePurchasing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, volumeContract, volumeOrder, unitPrice, vatRate, vatAmount, totalAmount, prepayPercent, prepayAmount, remainingAmount, orderStatus, contractStatus, invoiceStatus, paymentDate, ...data } = req.body;
    
    const updateData: any = {};
    if (data.stt !== undefined) updateData.stt = data.stt;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (volumeContract !== undefined) updateData.volume_contract = volumeContract;
    if (volumeOrder !== undefined) updateData.volume_order = volumeOrder;
    if (unitPrice !== undefined) updateData.unit_price = unitPrice;
    if (vatRate !== undefined) updateData.vat_rate = vatRate;
    if (vatAmount !== undefined) updateData.vat_amount = vatAmount;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;
    if (prepayPercent !== undefined) updateData.prepay_percent = prepayPercent;
    if (prepayAmount !== undefined) updateData.prepay_amount = prepayAmount;
    if (remainingAmount !== undefined) updateData.remaining_amount = remainingAmount;
    if (orderStatus !== undefined) updateData.order_status = orderStatus;
    if (contractStatus !== undefined) updateData.contract_status = contractStatus;
    if (invoiceStatus !== undefined) updateData.invoice_status = invoiceStatus;
    if (paymentDate !== undefined) updateData.payment_date = paymentDate ? new Date(paymentDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const p = await prisma.projectPurchasing.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    res.json(formatPurchasing(p));
  } catch (error) { res.status(500).json({ error: 'Failed to update purchasing' }); }
};

export const deletePurchasing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.projectPurchasing.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete purchasing' }); }
};


// --- EXPENSES ---
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const data = await prisma.projectExpense.findMany({
      include: { project: true },
      orderBy: { created_at: 'asc' }
    });
    const formatted = data.map(p => ({
      id: p.id,
      projectId: p.project_id,
      projectCode: p.project?.code || '',
      projectName: p.project?.name || '',
      stt: p.stt,
      expenseDate: p.expense_date,
      content: p.content,
      description: p.description,
      unit: p.unit,
      quantity: Number(p.quantity),
      unitPrice: Number(p.unit_price),
      taxAmount: Number(p.tax_amount),
      totalAmount: Number(p.total_amount),
      incomeAmount: Number(p.income_amount),
      balanceFund: Number(p.balance_fund),
      notes: p.notes,
      invoiceUrl: p.invoice_url
    }));
    res.json(formatted);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch expenses' }); }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { projectCode, expenseDate, quantity, unitPrice, taxAmount, totalAmount, incomeAmount, balanceFund, invoiceUrl, ...data } = req.body;
    const project_id = await resolveProjectId(projectCode);
    if (!project_id) return res.status(400).json({ error: 'Invalid projectCode' });

    const p = await prisma.projectExpense.create({
      data: {
        project_id,
        stt: data.stt,
        expense_date: expenseDate ? new Date(expenseDate) : new Date(),
        content: data.content,
        description: data.description || '',
        unit: data.unit || '',
        quantity: quantity || 0,
        unit_price: unitPrice || 0,
        tax_amount: taxAmount || 0,
        total_amount: totalAmount || 0,
        income_amount: incomeAmount || 0,
        balance_fund: balanceFund || 0,
        notes: data.notes || '',
        invoice_url: invoiceUrl || '',
      },
      include: { project: true }
    });
    res.status(201).json(p);
  } catch (error) { res.status(500).json({ error: 'Failed to create expense' }); }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, expenseDate, quantity, unitPrice, taxAmount, totalAmount, incomeAmount, balanceFund, invoiceUrl, ...data } = req.body;
    
    const updateData: any = {};
    if (data.stt !== undefined) updateData.stt = data.stt;
    if (expenseDate !== undefined) updateData.expense_date = expenseDate ? new Date(expenseDate) : new Date();
    if (data.content !== undefined) updateData.content = data.content;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unitPrice !== undefined) updateData.unit_price = unitPrice;
    if (taxAmount !== undefined) updateData.tax_amount = taxAmount;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;
    if (incomeAmount !== undefined) updateData.income_amount = incomeAmount;
    if (balanceFund !== undefined) updateData.balance_fund = balanceFund;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (invoiceUrl !== undefined) updateData.invoice_url = invoiceUrl;

    const p = await prisma.projectExpense.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    res.json(p);
  } catch (error) { res.status(500).json({ error: 'Failed to update expense' }); }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.projectExpense.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete expense' }); }
};


// --- PAYROLLS ---
export const getPayrolls = async (req: Request, res: Response) => {
  try {
    const data = await prisma.laborPayroll.findMany({
      include: { project: true },
      orderBy: { created_at: 'asc' }
    });
    const formatted = data.map(p => ({
      id: p.id,
      projectId: p.project_id,
      projectCode: p.project?.code || '',
      projectName: p.project?.name || '',
      stt: p.stt,
      payrollDate: p.payroll_date,
      content: p.content,
      description: p.description,
      workerName: p.worker_name,
      unit: p.unit,
      quantity: Number(p.quantity),
      unitPrice: Number(p.unit_price),
      totalAmount: Number(p.total_amount),
      bankAccount: p.bank_account,
      bankInfo: p.bank_info,
      idCardFrontUrl: p.id_card_front_url,
      idCardBackUrl: p.id_card_back_url,
      paymentStatus: p.payment_status,
      notes: p.notes
    }));
    res.json(formatted);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch payrolls' }); }
};

export const createPayroll = async (req: Request, res: Response) => {
  try {
    const { projectCode, payrollDate, quantity, unitPrice, totalAmount, bankAccount, bankInfo, idCardFrontUrl, idCardBackUrl, paymentStatus, workerName, ...data } = req.body;
    const project_id = await resolveProjectId(projectCode);
    if (!project_id) return res.status(400).json({ error: 'Invalid projectCode' });

    const p = await prisma.laborPayroll.create({
      data: {
        project_id,
        stt: data.stt,
        payroll_date: payrollDate ? new Date(payrollDate) : new Date(),
        content: data.content,
        description: data.description || '',
        worker_name: workerName || '',
        unit: data.unit || '',
        quantity: quantity || 0,
        unit_price: unitPrice || 0,
        total_amount: totalAmount || 0,
        bank_account: bankAccount || '',
        bank_info: bankInfo || '',
        id_card_front_url: idCardFrontUrl || '',
        id_card_back_url: idCardBackUrl || '',
        payment_status: paymentStatus || '',
        notes: data.notes || '',
      },
      include: { project: true }
    });
    res.status(201).json(p);
  } catch (error) { res.status(500).json({ error: 'Failed to create payroll' }); }
};

export const updatePayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, payrollDate, quantity, unitPrice, totalAmount, bankAccount, bankInfo, idCardFrontUrl, idCardBackUrl, paymentStatus, workerName, ...data } = req.body;
    
    const updateData: any = {};
    if (data.stt !== undefined) updateData.stt = data.stt;
    if (payrollDate !== undefined) updateData.payroll_date = payrollDate ? new Date(payrollDate) : new Date();
    if (data.content !== undefined) updateData.content = data.content;
    if (data.description !== undefined) updateData.description = data.description;
    if (workerName !== undefined) updateData.worker_name = workerName;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unitPrice !== undefined) updateData.unit_price = unitPrice;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;
    if (bankAccount !== undefined) updateData.bank_account = bankAccount;
    if (bankInfo !== undefined) updateData.bank_info = bankInfo;
    if (idCardFrontUrl !== undefined) updateData.id_card_front_url = idCardFrontUrl;
    if (idCardBackUrl !== undefined) updateData.id_card_back_url = idCardBackUrl;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const p = await prisma.laborPayroll.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    res.json(p);
  } catch (error) { res.status(500).json({ error: 'Failed to update payroll' }); }
};

export const deletePayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.laborPayroll.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete payroll' }); }
};


// --- DOCUMENT TRACKS ---
const formatDocumentTrack = (p: any) => ({
  id: p.id,
  projectId: p.project_id || '',
  projectCode: p.project?.code || '',
  projectName: p.project?.name || '',
  stt: p.stt,
  contractNo: p.contract_no,
  contractName: p.contract_name,
  company: p.company,
  receiverName: p.receiver_name,
  phone: p.phone,
  address: p.address,
  sendDate: p.send_date,
  receiveDate: p.receive_date,
  docStatus: p.doc_status,
  side: p.side,
  contractValue: Number(p.contract_value),
  prepayPercent: Number(p.prepay_percent),
  prepayAmount: Number(p.prepay_amount),
  paymentStatus: p.payment_status,
  isCompleted: p.is_completed,
  notes: p.notes
});

export const getDocumentTracks = async (req: Request, res: Response) => {
  try {
    const data = await prisma.documentTrack.findMany({
      include: { project: true },
      orderBy: [{ send_date: 'asc' }, { created_at: 'asc' }]
    });
    data.sort((a, b) => {
      const aNum = Number(String(a.stt || '').replace(/\D/g, ''));
      const bNum = Number(String(b.stt || '').replace(/\D/g, ''));
      if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
      return String(a.stt || '').localeCompare(String(b.stt || ''), 'vi');
    });
    res.json(data.map(formatDocumentTrack));
  } catch (error) { res.status(500).json({ error: 'Failed to fetch document tracks' }); }
};

export const createDocumentTrack = async (req: Request, res: Response) => {
  console.log('API HIT: /api/accounting/document-tracks');
  try {
    const { projectCode, sendDate, receiveDate, contractValue, prepayPercent, prepayAmount, isCompleted, contractNo, contractName, receiverName, paymentStatus, ...data } = req.body;
    const project_id = projectCode ? await resolveProjectId(projectCode) : null;

    const p = await prisma.documentTrack.create({
      data: {
        project_id,
        stt: data.stt,
        contract_no: contractNo || '',
        contract_name: contractName || '',
        company: data.company || '',
        receiver_name: receiverName || '',
        phone: data.phone || '',
        address: data.address || '',
        send_date: sendDate ? new Date(sendDate) : new Date(),
        receive_date: receiveDate ? new Date(receiveDate) : null,
        doc_status: data.docStatus || '',
        side: data.side || '',
        contract_value: contractValue || 0,
        prepay_percent: prepayPercent || 0,
        prepay_amount: prepayAmount || 0,
        payment_status: paymentStatus || '',
        is_completed: isCompleted || false,
        notes: data.notes || '',
      },
      include: { project: true }
    });
    res.status(201).json(formatDocumentTrack(p));
  } catch (error) { require('fs').appendFileSync('api_error.log', new Date().toISOString() + ' ' + String(error) + '\\n' + (error.stack || '') + '\\n' + JSON.stringify(req.body) + '\\n\\n'); console.error(error); res.status(500).json({ error: 'Failed to create document track' }); }
};

export const updateDocumentTrack = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, sendDate, receiveDate, contractValue, prepayPercent, prepayAmount, isCompleted, contractNo, contractName, receiverName, paymentStatus, ...data } = req.body;
    
    const updateData: any = {};
    if (projectCode !== undefined) updateData.project_id = projectCode ? await resolveProjectId(projectCode) : null;
    if (data.stt !== undefined) updateData.stt = data.stt;
    if (contractNo !== undefined) updateData.contract_no = contractNo;
    if (contractName !== undefined) updateData.contract_name = contractName;
    if (data.company !== undefined) updateData.company = data.company;
    if (receiverName !== undefined) updateData.receiver_name = receiverName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (sendDate !== undefined) updateData.send_date = sendDate ? new Date(sendDate) : new Date();
    if (receiveDate !== undefined) updateData.receive_date = receiveDate ? new Date(receiveDate) : null;
    if (data.docStatus !== undefined) updateData.doc_status = data.docStatus;
    if (data.side !== undefined) updateData.side = data.side;
    if (contractValue !== undefined) updateData.contract_value = contractValue;
    if (prepayPercent !== undefined) updateData.prepay_percent = prepayPercent;
    if (prepayAmount !== undefined) updateData.prepay_amount = prepayAmount;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (isCompleted !== undefined) updateData.is_completed = isCompleted;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const p = await prisma.documentTrack.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    res.json(formatDocumentTrack(p));
  } catch (error) { res.status(500).json({ error: 'Failed to update document track' }); }
};

export const deleteDocumentTrack = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.documentTrack.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete document track' }); }
};

