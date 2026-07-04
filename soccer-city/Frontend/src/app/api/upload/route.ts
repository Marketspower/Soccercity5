import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      );
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5MB)' },
        { status: 400 }
      );
    }

    // Générer un nom unique
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${Math.random().toString(36).slice(2, 7)}.${extension}`;

    // Upload vers Supabase Storage
    const buffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Récupérer l'URL publique
    const { data: publicUrl } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      fileName,
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}