import { Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { AuthRequest } from '../types/index.js';

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as {branchId?:string};
    const { role,userId,branchId:userBranchId } = req.user!;
    let scope='', params:unknown[]=[];
    if (role==='BRANCH_STAFF'&&userBranchId) { scope='WHERE branch_id=?'; params.push(userBranchId); }
    else if (branchId)                        { scope='WHERE branch_id=?'; params.push(branchId); }
    else if (role==='CUSTOMER')               { scope='WHERE sender_id=?'; params.push(userId); }

    const row = queryOne<any>(`SELECT COUNT(*) AS totalShipments, SUM(status='DELIVERED') AS delivered, SUM(status IN ('BOOKED','PICKED_UP','AT_BRANCH')) AS pending, SUM(status='IN_TRANSIT') AS inTransit, SUM(status='OUT_FOR_DELIVERY') AS outForDelivery, SUM(status='FAILED_ATTEMPT') AS failedAttempts, SUM(estimated_revenue) AS totalRevenue FROM shipments ${scope}`, params);

    const scopeBranch = branchId??(role==='BRANCH_STAFF'?userBranchId:undefined);
    const partnerRow = queryOne<{activePartners:number}>(`SELECT COUNT(DISTINCT assigned_partner_id) AS activePartners FROM shipments WHERE assigned_partner_id IS NOT NULL AND status NOT IN ('DELIVERED','FAILED_ATTEMPT') ${scopeBranch?'AND branch_id=?':''}`, scopeBranch?[scopeBranch]:[]);

    let totalBranches=0;
    if (role==='ADMIN') { totalBranches=queryOne<{cnt:number}>('SELECT COUNT(*) AS cnt FROM branches WHERE is_active=1')?.cnt??0; }

    res.json({ success:true,message:'OK',data:{ totalShipments:row?.totalShipments??0,delivered:row?.delivered??0,pending:row?.pending??0,inTransit:row?.inTransit??0,outForDelivery:row?.outForDelivery??0,failedAttempts:row?.failedAttempts??0,totalRevenue:row?.totalRevenue??0,activePartners:partnerRow?.activePartners??0,totalBranches } });
  } catch (err) { next(err); }
}

export async function getDeliveryTrends(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId,days='14' } = req.query as {branchId?:string;days?:string};
    const { role,branchId:userBranchId } = req.user!;
    const scopeBranch=branchId??(role==='BRANCH_STAFF'?userBranchId:undefined);
    const rows=query<{name:string;delivered:number}>(`SELECT strftime('%b %d',delivered_date) AS name, COUNT(*) AS delivered FROM shipments WHERE status='DELIVERED' AND delivered_date>=datetime('now','-${Number(days)} days') ${scopeBranch?'AND branch_id=?':''} GROUP BY date(delivered_date) ORDER BY date(delivered_date) ASC`,scopeBranch?[scopeBranch]:[]);
    res.json({ success:true,message:'OK',data:rows });
  } catch (err) { next(err); }
}

export async function getStatusBreakdown(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as {branchId?:string};
    const { role,branchId:userBranchId } = req.user!;
    const scopeBranch=branchId??(role==='BRANCH_STAFF'?userBranchId:undefined);
    const rows=query<{name:string;value:number}>(`SELECT status AS name,COUNT(*) AS value FROM shipments ${scopeBranch?'WHERE branch_id=?':''} GROUP BY status`,scopeBranch?[scopeBranch]:[]);
    res.json({ success:true,message:'OK',data:rows });
  } catch (err) { next(err); }
}

export async function getBranchRevenue(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows=query<{name:string;value:number}>(`SELECT b.name,COALESCE(SUM(s.estimated_revenue),0) AS value FROM branches b LEFT JOIN shipments s ON s.branch_id=b.id WHERE b.is_active=1 GROUP BY b.id,b.name ORDER BY value DESC LIMIT 10`);
    res.json({ success:true,message:'OK',data:rows });
  } catch (err) { next(err); }
}

export async function getTopPartners(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows=query<{name:string;deliveries:number}>(`SELECT u.name,COUNT(s.id) AS deliveries FROM users u JOIN shipments s ON s.assigned_partner_id=u.id AND s.status='DELIVERED' WHERE u.role='DELIVERY_PARTNER' GROUP BY u.id,u.name ORDER BY deliveries DESC LIMIT 10`);
    res.json({ success:true,message:'OK',data:rows });
  } catch (err) { next(err); }
}

export async function getLivePartners(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as {branchId?:string};
    const { role,branchId:userBranchId } = req.user!;
    const scopeBranch=branchId??(role==='BRANCH_STAFF'?userBranchId:undefined);
    const rows=query<any>(`SELECT u.id AS partnerId,u.name AS partnerName,s.id AS shipmentId,s.tracking_id AS trackingId,s.current_lat AS lat,s.current_lng AS lng FROM shipments s JOIN users u ON s.assigned_partner_id=u.id WHERE s.status='OUT_FOR_DELIVERY' AND s.current_lat IS NOT NULL ${scopeBranch?'AND s.branch_id=?':''}`,scopeBranch?[scopeBranch]:[]);
    res.json({ success:true,message:'OK',data:rows });
  } catch (err) { next(err); }
}
