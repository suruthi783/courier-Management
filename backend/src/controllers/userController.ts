import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, User } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, search, branchId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (role)     { conditions.push('u.role = ?');                                  params.push(role); }
    if (branchId) { conditions.push('u.branch_id = ?');                             params.push(branchId); }
    if (search)   { conditions.push('(u.name LIKE ? OR u.email LIKE ?)');           params.push(`%${search}%`, `%${search}%`); }
    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(pageSize);
    const users  = query<User>(`SELECT u.id,u.name,u.email,u.phone,u.role,u.avatar,u.branch_id,u.is_active,u.created_at,b.name AS branch_name FROM users u LEFT JOIN branches b ON u.branch_id=b.id ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    const total  = (queryOne<{total:number}>(`SELECT COUNT(*) AS total FROM users u ${where}`, params)?.total) ?? 0;
    res.json({ success:true, message:'OK', data:users, total, page:Number(page), pageSize:Number(pageSize), totalPages:Math.ceil(total/Number(pageSize)) });
  } catch (err) { next(err); }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = queryOne<User>(`SELECT u.id,u.name,u.email,u.phone,u.role,u.avatar,u.branch_id,u.is_active,u.created_at,b.name AS branch_name FROM users u LEFT JOIN branches b ON u.branch_id=b.id WHERE u.id=?`, [req.params.id]);
    if (!user) { res.status(404).json({ success:false, message:'User not found' }); return; }
    res.json({ success:true, message:'OK', data:user });
  } catch (err) { next(err); }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, password, role, branchId, avatar } = req.body as { name:string;email:string;phone:string;password:string;role:string;branchId?:string;avatar?:string };
    if (queryOne('SELECT id FROM users WHERE email=?',[email])) { res.status(409).json({ success:false, message:'Email already in use' }); return; }
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    execute(`INSERT INTO users (id,name,email,phone,password_hash,role,avatar,branch_id,is_active) VALUES (?,?,?,?,?,?,?,?,1)`, [id,name,email,phone,hash,role,avatar??null,branchId??null]);
    const newUser = queryOne<User>('SELECT id,name,email,phone,role,avatar,branch_id,is_active,created_at FROM users WHERE id=?',[id]);
    logAudit({ userId:req.user!.userId, action:'USER_CREATED', resource:'USER', resourceId:id, details:`Created ${email}`, ipAddress:req.ip });
    res.status(201).json({ success:true, message:'User created', data:newUser });
  } catch (err) { next(err); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!queryOne('SELECT id FROM users WHERE id=?',[id])) { res.status(404).json({ success:false, message:'User not found' }); return; }
    const { name, phone, role, branchId, avatar } = req.body as Partial<{name:string;phone:string;role:string;branchId:string;avatar:string}>;
    const fields:string[]=[], params:unknown[]=[];
    if (name!==undefined)    { fields.push('name=?');      params.push(name); }
    if (phone!==undefined)   { fields.push('phone=?');     params.push(phone); }
    if (role!==undefined)    { fields.push('role=?');      params.push(role); }
    if (branchId!==undefined){ fields.push('branch_id=?'); params.push(branchId||null); }
    if (avatar!==undefined)  { fields.push('avatar=?');    params.push(avatar); }
    if (!fields.length) { res.status(400).json({ success:false, message:'No fields to update' }); return; }
    params.push(id);
    execute(`UPDATE users SET ${fields.join(',')} WHERE id=?`, params);
    const updated = queryOne<User>('SELECT id,name,email,phone,role,avatar,branch_id,is_active,created_at FROM users WHERE id=?',[id]);
    logAudit({ userId:req.user!.userId, action:'USER_UPDATED', resource:'USER', resourceId:id, details:`Updated ${id}`, ipAddress:req.ip });
    res.json({ success:true, message:'Updated', data:updated });
  } catch (err) { next(err); }
}

export async function toggleUserActive(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = queryOne<User>('SELECT id,is_active FROM users WHERE id=?',[id]);
    if (!user) { res.status(404).json({ success:false, message:'User not found' }); return; }
    const newStatus = user.is_active ? 0 : 1;
    execute('UPDATE users SET is_active=? WHERE id=?',[newStatus,id]);
    logAudit({ userId:req.user!.userId, action:newStatus?'USER_ACTIVATED':'USER_DEACTIVATED', resource:'USER', resourceId:id, details:`User ${id} set to ${newStatus?'active':'inactive'}`, ipAddress:req.ip });
    res.json({ success:true, message:`User ${newStatus?'activated':'deactivated'}`, data:{id,is_active:!!newStatus} });
  } catch (err) { next(err); }
}

export async function getDeliveryPartners(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as { branchId?:string };
    const partners = query<User>(`SELECT id,name,email,phone,is_active FROM users WHERE role='DELIVERY_PARTNER' AND is_active=1 ${branchId?'AND branch_id=?':''} ORDER BY name`, branchId?[branchId]:[]);
    res.json({ success:true, message:'OK', data:partners });
  } catch (err) { next(err); }
}
