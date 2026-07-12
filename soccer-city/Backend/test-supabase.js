const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Utiliser la SERVICE ROLE KEY au lieu de la clé anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📡 Test de connexion Supabase...');
console.log('URL:', supabaseUrl);

async function testConnection() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log('✅ Connexion réussie !');
    console.log('📊 Terrains trouvés:', data);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testConnection();