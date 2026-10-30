import { Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { AuthRequest, AuditLog } from '../types/index.js';

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId,resource,action,from,to,page='1',pageSize='50' } = req.query as Record<string,string>;
    const conditions:string[]=[], params:unknown[]=[];
    if (userId)   { conditions.push('a.user_id=?');    params.push(userId); }
    if (resource) { conditions.push('a.resource=?');   params.push(resource); }
    if (action)   { conditions.push('a.action=?');     params.push(action); }
    if (from)     { conditions.push('a.timestamp>=?'); params.push(from); }
    if (to)       { conditions.push('a.timestamp<=?'); params.push(to); }
    const where  = conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
    const offset = (Number(page)-1)*Number(pageSize);
    const logs   = query<AuditLog>(`SELECT a.*,u.name AS user_name FROM audit_logs a LEFT JOIN users u ON a.user_id=u.id ${where} ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`,[...params,Number(pageSize),offset]);
    const total  = queryOne<{total:number}>(`SELECT COUNT(*) AS total FROM audit_logs a ${where}`,params)?.total??0;
    res.json({ success:true,message:'OK',data:logs,total,page:Number(page),pageSize:Number(pageSize),totalPages:Math.ceil(total/Number(pageSize)) });
  } catch (err) { next(err); }
}
