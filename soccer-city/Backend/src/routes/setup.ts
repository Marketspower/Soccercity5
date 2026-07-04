import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/realtimeService';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/setup-database', async (req: Request, res: Response) => {
  try {
    // Lire le fichier schema.sql
    const schemaPath = path.join(__dirname, '../../supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Exécuter le schéma
    const { error } = await supabaseAdmin.rpc('exec_sql', { query: schema });

    if (error) {
      console.error('Erreur:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: '✅ Base de données initialisée avec succès' });
  } catch (error) {
    console.error('Erreur setup:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation' });
  }
});

export default router;