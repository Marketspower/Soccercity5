// backend/src/controllers/galleryController.ts
import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabaseAdmin } from '../services/realtimeService';

// ============================================
// GALLERY - Gestion des images
// ============================================

export const getGalleryImages = async (_req: Request, res: Response): Promise<Response> => {
  try {
    console.log('🔄 Récupération des images de la galerie...');
    
    const images = await prisma.gallery.findMany({
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log('✅ Images récupérées:', images.length);
    return res.json(images);
  } catch (error) {
    console.error('❌ Erreur getGalleryImages:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des images',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const uploadGalleryImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { imageUrl, alt, eventId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL de l\'image requise' });
    }

    // Compter les images existantes pour le sortOrder
    const count = await prisma.gallery.count({
      where: eventId ? { eventId } : undefined
    });

    const image = await prisma.gallery.create({
      data: {
        imageUrl,
        alt: alt || 'Image de la galerie',
        sortOrder: count,
        eventId: eventId || null
      }
    });

    console.log('✅ Image ajoutée à la galerie:', image);
    return res.status(201).json(image);
  } catch (error) {
    console.error('❌ Erreur uploadGalleryImage:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'upload de l\'image',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const deleteGalleryImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const image = await prisma.gallery.findUnique({
      where: { id }
    });

    if (!image) {
      return res.status(404).json({ error: 'Image non trouvée' });
    }

    // Supprimer l'image du storage Supabase
    if (image.imageUrl) {
      const path = image.imageUrl.split('/').pop();
      if (path) {
        await supabaseAdmin.storage
          .from('images')
          .remove([`gallery/${path}`])
          .catch((err: Error) => console.warn('⚠️ Erreur suppression storage:', err));
      }
    }

    await prisma.gallery.delete({
      where: { id }
    });

    return res.json({ message: 'Image supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur deleteGalleryImage:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'image',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const reorderGalleryImages = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Liste d\'IDs requise' });
    }

    // Mettre à jour l'ordre des images
    const updates = ids.map((id: string, index: number) =>
      prisma.gallery.update({
        where: { id },
        data: { sortOrder: index }
      })
    );

    await Promise.all(updates);

    const updatedImages = await prisma.gallery.findMany({
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(updatedImages);
  } catch (error) {
    console.error('❌ Erreur reorderGalleryImages:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la réorganisation des images',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

// ============================================
// GALLERY PAR ÉVÉNEMENT
// ============================================

export const getGalleryByEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { eventId } = req.params;

    const images = await prisma.gallery.findMany({
      where: { eventId },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(images);
  } catch (error) {
    console.error('❌ Erreur getGalleryByEvent:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des images',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};