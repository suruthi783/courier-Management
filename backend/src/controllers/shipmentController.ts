import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, Shipment, ShipmentTimeline } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateOtp, generateTrackingId } from '../utils/generateOtp.js';

function getTimeline(shipmentId: string): ShipmentTimeline[] {
  return query<ShipmentTimeline>('SELECT * FROM shipment_timeline WHERE shipment_id=? ORDER BY timestamp ASC',[shipmentId]);
}

function fetchShipment(id: string): (Shipment & { timeline: ShipmentTimeline[] }) | null {
  const s = queryOne<Shipment>(`SELECT s.*,b.name AS branch_name,p.name AS assigned_partner_name FROM shipments s LEFT JOIN branches b ON s.branch_id=b.id LEFT JOIN users p ON s.assigned_partner_id=p.id WHERE s.id=?`,[id]);
  if (!s) return null;
  return { ...s, timeline: getTimeline(id) };
}

export async function getShipments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status,branchId,partnerId,senderId,search,page='1',pageSize='20' } = req.query as Record<string,string>;
    const conditions:string[]=[], params:unknown[]=[];
    const { role,userId,branchId:userBranchId } = req.user!;
    if (role==='CUSTOMER')                         { conditions.push('s.sender_id=?');            params.push(userId); }
    else if (role==='BRANCH_STAFF'&&userBranchId)  { conditions.push('s.branch_id=?');            params.push(userBranchId); }
    else if (role==='DELIVERY_PARTNER')            { conditions.push('s.assigned_partner_id=?');  params.push(userId); }
    if (status)    { conditions.push('s.status=?');              params.push(status); }
    if (branchId)  { conditions.push('s.branch_id=?');           params.push(branchId); }
    if (partnerId) { conditions.push('s.assigned_partner_id=?'); params.push(partnerId); }
    if (senderId)  { conditions.push('s.sender_id=?');           params.push(senderId); }
    if (search)    { conditions.push('(s.tracking_id LIKE ? OR s.package_name LIKE ? OR s.receiver_name LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    const where  = conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
    const offset = (Number(page)-1)*Number(pageSize);
    const shipments = query<Shipment>(`SELECT s.*,b.name AS branch_name,p.name AS assigned_partner_name FROM shipments s LEFT JOIN branches b ON s.branch_id=b.id LEFT JOIN users p ON s.assigned_partner_id=p.id ${where} ORDER BY s.booking_date DESC LIMIT ? OFFSET ?`,[...params,Number(pageSize),offset]);
    const total = queryOne<{total:number}>(`SELECT COUNT(*) AS total FROM shipments s ${where}`,params)?.total??0;
    res.json({ success:true,message:'OK',data:shipments,total,page:Number(page),pageSize:Number(pageSize),totalPages:Math.ceil(total/Number(pageSize)) });
  } catch (err) { next(err); }
}

export async function getShipmentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = fetchShipment(req.params.id);
    if (!s) { res.status(404).json({ success:false,message:'Not found' }); return; }
    res.json({ success:true,message:'OK',data:s });
  } catch (err) { next(err); }
}

export async function trackShipment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = queryOne<Shipment>(`SELECT s.*,b.name AS branch_name,p.name AS assigned_partner_name FROM shipments s LEFT JOIN branches b ON s.branch_id=b.id LEFT JOIN users p ON s.assigned_partner_id=p.id WHERE s.tracking_id=?`,[req.params.trackingId]);
    if (!s) { res.status(404).json({ success:false,message:'Not found' }); return; }
    res.json({ success:true,message:'OK',data:{ ...s, timeline:getTimeline(s.id) } });
  } catch (err) { next(err); }
}

export async function createShipment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { packageName,packageDescription,packageWeight,packageType,senderName,senderAddress,senderPhone,receiverName,receiverAddress,receiverPhone,branchId,expectedDeliveryDate,estimatedRevenue } = req.body as any;
    const id=uuidv4(), trackingId=generateTrackingId(), senderId=req.user!.userId;
    execute(`INSERT INTO shipments (id,tracking_id,package_name,package_description,package_weight,package_type,sender_id,sender_name,sender_address,sender_phone,receiver_name,receiver_address,receiver_phone,status,branch_id,booking_date,expected_delivery_date,otp_attempts,estimated_revenue) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'BOOKED',?,datetime('now'),?,0,?)`,[id,trackingId,packageName,packageDescription??null,packageWeight??null,packageType??null,senderId,senderName,senderAddress,senderPhone,receiverName,receiverAddress,receiverPhone,branchId,expectedDeliveryDate,estimatedRevenue??0]);
    execute(`INSERT INTO shipment_timeline (id,shipment_id,status,timestamp,note) VALUES (?,?,'BOOKED',datetime('now'),'Shipment booked')`,[uuidv4(),id]);
    logAudit({ userId:senderId,action:'SHIPMENT_CREATED',resource:'SHIPMENT',resourceId:id,details:`Created ${trackingId}`,ipAddress:req.ip });
    res.status(201).json({ success:true,message:'Shipment created',data:fetchShipment(id) });
  } catch (err) { next(err); }
}

export async function updateShipmentStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status,note,location } = req.body as {status:string;note?:string;location?:string};
    const shipment = queryOne<Shipment>('SELECT * FROM shipments WHERE id=?',[id]);
    if (!shipment) { res.status(404).json({ success:false,message:'Not found' }); return; }
    if (status==='OUT_FOR_DELIVERY'&&!shipment.delivery_otp) {
      execute('UPDATE shipments SET status=?,delivery_otp=? WHERE id=?',[status,generateOtp(),id]);
    } else {
      execute('UPDATE shipments SET status=? WHERE id=?',[status,id]);
    }
    execute(`INSERT INTO shipment_timeline (id,shipment_id,status,timestamp,location,note) VALUES (?,?,?,datetime('now'),?,?)`,[uuidv4(),id,status,location??null,note??null]);
    logAudit({ userId:req.user!.userId,action:'STATUS_UPDATE',resource:'SHIPMENT',resourceId:id,details:`Status→${status}`,ipAddress:req.ip });
    res.json({ success:true,message:'Updated',data:fetchShipment(id) });
  } catch (err) { next(err); }
}

export async function assignPartner(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { partnerId } = req.body as {partnerId:string};
    if (!queryOne('SELECT id FROM shipments WHERE id=?',[id])) { res.status(404).json({ success:false,message:'Shipment not found' }); return; }
    const partner = queryOne<{id:string;name:string;role:string}>(`SELECT id,name,role FROM users WHERE id=? AND is_active=1`,[partnerId]);
    if (!partner||partner.role!=='DELIVERY_PARTNER') { res.status(404).json({ success:false,message:'Delivery partner not found' }); return; }
    execute('UPDATE shipments SET assigned_partner_id=? WHERE id=?',[partnerId,id]);
    logAudit({ userId:req.user!.userId,action:'ASSIGNMENT',resource:'SHIPMENT',resourceId:id,details:`Assigned ${partner.name}`,ipAddress:req.ip });
    res.json({ success:true,message:'Partner assigned',data:fetchShipment(id) });
  } catch (err) { next(err); }
}

export async function updateLocation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { lat,lng } = req.body as {lat:number;lng:number};
    execute('UPDATE shipments SET current_lat=?,current_lng=? WHERE id=?',[lat,lng,id]);
    res.json({ success:true,message:'Location updated' });
  } catch (err) { next(err); }
}
