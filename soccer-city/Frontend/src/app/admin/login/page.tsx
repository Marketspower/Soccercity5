"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Vérifier si l'utilisateur est admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Erreur vérification rôle:', userError);
        if (userError.code === 'PGRST116') {
          // Créer l'utilisateur dans la table users
          await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              first_name: 'Admin',
              last_name: 'Soccer City',
              role: 'admin',
              phone: '+1 (450) 555-0192'
            }]);
          
          const { data: newUserData } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();
          
          if (newUserData?.role === 'admin') {
            setSuccess(true);
            setTimeout(() => router.push('/admin'), 500);
            return;
          }
        }
        setError("Erreur lors de la vérification des droits");
        setLoading(false);
        return;
      }

      if (userData?.role !== 'admin') {
        await supabase.auth.signOut();
        setError("Accès non autorisé. Vous devez être administrateur.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/admin'), 500);
      
    } catch (error: any) {
      setError(error.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚽</div>
            <h1 className="text-3xl font-bold text-white">Administration</h1>
            <p className="text-white/50 text-sm mt-2">Connectez-vous pour accéder au tableau de bord</p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-green-400 font-medium">Connexion réussie !</p>
              <p className="text-white/40 text-sm mt-2">Redirection vers le tableau de bord...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@soccercity.ca"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Mot de passe</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Connexion en cours...
                  </span>
                ) : (
                  "Se connecter"
                )}
              </Button>

              <p className="text-xs text-white/20 text-center">
                Accès réservé aux administrateurs
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}