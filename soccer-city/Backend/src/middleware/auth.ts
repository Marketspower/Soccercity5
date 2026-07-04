import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/realtimeService';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token d\'authentification requis' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    // Vérifier le rôle de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    (req as any).user = { ...user, role: userData?.role || 'client' };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentification échouée' });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès administrateur requis' });
    return;
  }
  next();
};