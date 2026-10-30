import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, Notification } from '../types/index.js';

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { unreadOnly } = req.query as {unreadOnly?:string};
    const notifications = query<Notification>(`SELECT * FROM notifications WHERE user_id=? ${unreadOnly==='true'?'AND is_read=0':''} ORDER BY created_at DESC LIMIT 50`,[userId]);
    const unreadCount = queryOne<{cnt:number}>('SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND is_read=0',[userId])?.cnt??0;
    res.json({ success:true,message:'OK',data:notifications,unreadCount });
  } catch (err) { next(err); }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!queryOne('SELECT id FROM notifications WHERE id=? AND user_id=?',[id,req.user!.userId])) { res.status(404).json({ success:false,message:'Not found' }); return; }
    execute('UPDATE notifications SET is_read=1 WHERE id=?',[id]);
    res.json({ success:true,message:'Marked as read' });
  } catch (err) { next(err); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    execute('UPDATE notifications SET is_read=1 WHERE user_id=?',[req.user!.userId]);
    res.json({ success:true,message:'All marked as read' });
  } catch (err) { next(err); }
}

export async function createNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId,type,title,message,shipmentId,trackingId } = req.body as {userId:string;type:string;title:string;message:string;shipmentId?:string;trackingId?:string};
    const id = uuidv4();
    execute(`INSERT INTO notifications (id,user_id,type,title,message,shipment_id,tracking_id,is_read) VALUES (?,?,?,?,?,?,?,0)`,[id,userId,type,title,message,shipmentId??null,trackingId??null]);
    res.status(201).json({ success:true,message:'Created',data:queryOne<Notification>('SELECT * FROM notifications WHERE id=?',[id]) });
  } catch (err) { next(err); }
}
