import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../config/database.js';
import { UserWithPassword, JwtPayload, AuthRequest } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

const JWT_SECRET     = process.env.JWT_SECRET     ?? 'courier_super_secret_jwt_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = queryOne<UserWithPassword>(
      `SELECT u.*, b.name AS branch_name
       FROM users u LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.email = ? AND u.is_active = 1`, [email]
    );

    if (!user) { res.status(401).json({ success: false, message: 'Invalid email or password' }); return; }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) { res.status(401).json({ success: false, message: 'Invalid email or password' }); return; }

    const payload: JwtPayload = { userId: user.id, role: user.role, branchId: user.branch_id ?? undefined };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    const { password_hash, ...safeUser } = user;

    logAudit({ userId: user.id, action: 'LOGIN', resource: 'USER', resourceId: user.id, details: `User ${user.email} logged in`, ipAddress: req.ip });

    res.json({ success: true, message: 'Login successful', data: { user: safeUser, token } });
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = queryOne<UserWithPassword>(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar, u.branch_id, u.is_active, u.created_at, b.name AS branch_name
       FROM users u LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ? AND u.is_active = 1`, [req.user!.userId]
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, message: 'OK', data: user });
  } catch (err) { next(err); }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    logAudit({ userId: req.user!.userId, action: 'LOGOUT', resource: 'USER', resourceId: req.user!.userId, details: 'User logged out', ipAddress: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const userId = req.user!.userId;
    const user = queryOne<UserWithPassword>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) { res.status(400).json({ success: false, message: 'Current password is incorrect' }); return; }
    const newHash = await bcrypt.hash(newPassword, 10);
    execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    logAudit({ userId, action: 'PASSWORD_CHANGED', resource: 'USER', resourceId: userId, details: 'Password changed', ipAddress: req.ip });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
}
