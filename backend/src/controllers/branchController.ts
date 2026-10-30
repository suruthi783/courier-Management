import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, Branch } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

export async function getBranches(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const branches = query<Branch>(`SELECT b.*, u.name AS manager_name, (SELECT COUNT(*) FROM shipments s WHERE s.branch_id=b.id) AS shipment_count, (SELECT COUNT(*) FROM users us WHERE us.branch_id=b.id AND us.role='BRANCH_STAFF') AS staff_count FROM branches b LEFT JOIN users u ON b.manager_id=u.id ORDER BY b.created_at DESC`);
    res.json({ success:true, message:'OK', data:branches });
  } catch (err) { next(err); }
}

export async function getBranchById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const branch = queryOne<Branch>(`SELECT b.*,u.name AS manager_name FROM branches b LEFT JOIN users u ON b.manager_id=u.id WHERE b.id=?`,[req.params.id]);
    if (!branch) { res.status(404).json({ success:false, message:'Branch not found' }); return; }
    res.json({ success:true, message:'OK', data:branch });
  } catch (err) { next(err); }
}

export async function createBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name,code,address,city,state,lat,lng,managerId } = req.body as {name:string;code:string;address:string;city:string;state:string;lat:number;lng:number;managerId?:string};
    if (queryOne('SELECT id FROM branches WHERE code=?',[code])) { res.status(409).json({ success:false, message:'Branch code already in use' }); return; }
    const id = uuidv4();
    execute(`INSERT INTO branches (id,name,code,address,city,state,lat,lng,manager_id,is_active) VALUES (?,?,?,?,?,?,?,?,?,1)`,[id,name,code,address,city,state,lat,lng,managerId??null]);
    const newBranch = queryOne<Branch>('SELECT * FROM branches WHERE id=?',[id]);
    logAudit({ userId:req.user!.userId, action:'BRANCH_CREATED', resource:'BRANCH', resourceId:id, details:`Created ${name}`, ipAddress:req.ip });
    res.status(201).json({ success:true, message:'Branch created', data:newBranch });
  } catch (err) { next(err); }
}

export async function updateBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!queryOne('SELECT id FROM branches WHERE id=?',[id])) { res.status(404).json({ success:false, message:'Branch not found' }); return; }
    const { name,code,address,city,state,lat,lng,managerId } = req.body as Partial<{name:string;code:string;address:string;city:string;state:string;lat:number;lng:number;managerId:string}>;
    const fields:string[]=[], params:unknown[]=[];
    if (name!==undefined)      { fields.push('name=?');       params.push(name); }
    if (code!==undefined)      { fields.push('code=?');       params.push(code); }
    if (address!==undefined)   { fields.push('address=?');    params.push(address); }
    if (city!==undefined)      { fields.push('city=?');       params.push(city); }
    if (state!==undefined)     { fields.push('state=?');      params.push(state); }
    if (lat!==undefined)       { fields.push('lat=?');        params.push(lat); }
    if (lng!==undefined)       { fields.push('lng=?');        params.push(lng); }
    if (managerId!==undefined) { fields.push('manager_id=?'); params.push(managerId||null); }
    if (!fields.length) { res.status(400).json({ success:false, message:'No fields to update' }); return; }
    params.push(id);
    execute(`UPDATE branches SET ${fields.join(',')} WHERE id=?`,params);
    const updated = queryOne<Branch>('SELECT * FROM branches WHERE id=?',[id]);
    logAudit({ userId:req.user!.userId, action:'BRANCH_UPDATED', resource:'BRANCH', resourceId:id, details:`Updated ${id}`, ipAddress:req.ip });
    res.json({ success:true, message:'Updated', data:updated });
  } catch (err) { next(err); }
}

export async function toggleBranchActive(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const branch = queryOne<Branch>('SELECT id,is_active FROM branches WHERE id=?',[id]);
    if (!branch) { res.status(404).json({ success:false, message:'Branch not found' }); return; }
    const newStatus = branch.is_active ? 0 : 1;
    execute('UPDATE branches SET is_active=? WHERE id=?',[newStatus,id]);
    logAudit({ userId:req.user!.userId, action:newStatus?'BRANCH_ACTIVATED':'BRANCH_DEACTIVATED', resource:'BRANCH', resourceId:id, details:`Branch ${id} ${newStatus?'activated':'deactivated'}`, ipAddress:req.ip });
    res.json({ success:true, message:`Branch ${newStatus?'activated':'deactivated'}`, data:{id,is_active:!!newStatus} });
  } catch (err) { next(err); }
}

export async function deleteBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!queryOne('SELECT id FROM branches WHERE id=?',[id])) { res.status(404).json({ success:false, message:'Branch not found' }); return; }
    const active = queryOne<{cnt:number}>(`SELECT COUNT(*) AS cnt FROM shipments WHERE branch_id=? AND status NOT IN ('DELIVERED','FAILED_ATTEMPT')`,[id]);
    if ((active?.cnt??0)>0) { res.status(409).json({ success:false, message:'Cannot delete branch with active shipments' }); return; }
    execute('DELETE FROM branches WHERE id=?',[id]);
    logAudit({ userId:req.user!.userId, action:'BRANCH_DELETED', resource:'BRANCH', resourceId:id, details:`Deleted ${id}`, ipAddress:req.ip });
    res.json({ success:true, message:'Deleted' });
  } catch (err) { next(err); }
}
