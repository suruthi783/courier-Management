import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, Shipment } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

export async function verifyOtp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shipmentId,otp } = req.body as {shipmentId:string;otp:string};
    const s = queryOne<Shipment>('SELECT id,delivery_otp,otp_attempts,status FROM shipments WHERE id=?',[shipmentId]);
    if (!s) { res.status(404).json({ success:false,message:'Not found' }); return; }
    if (s.status!=='OUT_FOR_DELIVERY') { res.status(400).json({ success:false,message:'Shipment not out for delivery' }); return; }
    if (s.otp_attempts>=3) { res.status(400).json({ success:false,message:'Max OTP attempts reached' }); return; }
    if (s.delivery_otp!==otp) {
      execute('UPDATE shipments SET otp_attempts=otp_attempts+1 WHERE id=?',[shipmentId]);
      const remaining=3-(s.otp_attempts+1);
      res.status(400).json({ success:false,message:`Invalid OTP. ${remaining} attempt${remaining!==1?'s':''} remaining`,attemptsLeft:remaining }); return;
    }
    res.json({ success:true,message:'OTP verified' });
  } catch (err) { next(err); }
}

export async function updateDelivery(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shipmentId,status,otp,failedReason,note } = req.body as {shipmentId:string;status:'DELIVERED'|'FAILED_ATTEMPT';otp?:string;failedReason?:string;note?:string};
    const s = queryOne<Shipment>('SELECT id,delivery_otp,otp_attempts,status,sender_id,tracking_id FROM shipments WHERE id=?',[shipmentId]);
    if (!s) { res.status(404).json({ success:false,message:'Not found' }); return; }
    if (s.status!=='OUT_FOR_DELIVERY') { res.status(400).json({ success:false,message:'Shipment not out for delivery' }); return; }
    if (status==='DELIVERED') {
      if (!otp) { res.status(400).json({ success:false,message:'OTP required' }); return; }
      if (s.otp_attempts>=3) { res.status(400).json({ success:false,message:'Max OTP attempts reached' }); return; }
      if (s.delivery_otp!==otp) { execute('UPDATE shipments SET otp_attempts=otp_attempts+1 WHERE id=?',[shipmentId]); res.status(400).json({ success:false,message:'Invalid OTP' }); return; }
      execute(`UPDATE shipments SET status=?,delivered_date=datetime('now') WHERE id=?`,[status,shipmentId]);
    } else {
      execute('UPDATE shipments SET status=? WHERE id=?',[status,shipmentId]);
    }
    const detailNote=[failedReason,note].filter(Boolean).join(': ')||null;
    execute(`INSERT INTO shipment_timeline (id,shipment_id,status,timestamp,note) VALUES (?,?,?,datetime('now'),?)`,[uuidv4(),shipmentId,status,detailNote]);
    execute(`INSERT INTO notifications (id,user_id,type,title,message,shipment_id,tracking_id,is_read) VALUES (?,?,?,?,?,?,?,0)`,[uuidv4(),s.sender_id,status==='DELIVERED'?'STATUS_UPDATE':'DELIVERY_ATTEMPT',status==='DELIVERED'?'Package Delivered!':'Delivery Attempt Failed',status==='DELIVERED'?`Your package ${s.tracking_id} has been delivered.`:`Delivery attempt for ${s.tracking_id} failed. Reason: ${failedReason??'Not specified'}`,shipmentId,s.tracking_id]);
    logAudit({ userId:req.user!.userId,action:status==='DELIVERED'?'DELIVERY_COMPLETED':'DELIVERY_FAILED',resource:'SHIPMENT',resourceId:shipmentId,details:`${status}${detailNote?': '+detailNote:''}`,ipAddress:req.ip });
    res.json({ success:true,message:'Updated',data:queryOne<Shipment>('SELECT * FROM shipments WHERE id=?',[shipmentId]) });
  } catch (err) { next(err); }
}

export async function getMyDeliveries(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const partnerId=req.user!.userId;
    const shipments=query<Shipment>(`SELECT s.*,b.name AS branch_name FROM shipments s LEFT JOIN branches b ON s.branch_id=b.id WHERE s.assigned_partner_id=? AND s.status NOT IN ('DELIVERED','FAILED_ATTEMPT') ORDER BY s.expected_delivery_date ASC`,[partnerId]);
    const stats=queryOne<{delivered:number;failed:number;total:number}>(`SELECT SUM(status='DELIVERED') AS delivered,SUM(status='FAILED_ATTEMPT') AS failed,COUNT(*) AS total FROM shipments WHERE assigned_partner_id=?`,[partnerId]);
    res.json({ success:true,message:'OK',data:shipments,stats });
  } catch (err) { next(err); }
}
