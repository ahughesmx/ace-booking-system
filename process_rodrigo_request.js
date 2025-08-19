// Script para procesar correctamente la solicitud de Rodrigo
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bpjinatcgdmxqetfxjji.supabase.co',
  'eyJhbGciOiJIUzI1NiIsImtpZCI6InRpeEY2STkvbGFKWXVjTnkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2JwamluYXRjZ2RteHFldGZ4amppLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZTAzZmQ3YS0wNTU0LTRkYzgtYmJkMi1iOThlODQ4ZDBiMGUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1NjI5NDE3LCJpYXQiOjE3NTU2MjU4MTcsImVtYWlsIjoidGVzdEBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NTYyNTgxN31dLCJzZXNzaW9uX2lkIjoiYTZhZTQxM2QtODZiMy00YWI0LWE3NWUtOTU4MjA1ZTFiNjZlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.2Lj2t-TaNKctG4hvJAhAcP-zulK1C4VGNaaIzw6Ttz8'
);

async function processRodrigoRequest() {
  try {
    console.log('🎯 Procesando solicitud de Rodrigo correctamente...');
    
    // Llamar a la edge function process-registration-request con los datos correctos
    const { data, error } = await supabase.functions.invoke('process-registration-request', {
      body: {
        requestId: '3d178442-dfb5-4c53-bd08-1a242f2dcedf',
        action: 'approve'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error('❌ Error procesando solicitud:', error);
      return;
    }
    
    console.log('✅ Solicitud procesada exitosamente:', data);
    console.log('🎉 Rodrigo Baldomar debería aparecer ahora en Gestión de Usuarios');
    
  } catch (err) {
    console.error('💥 Error inesperado:', err);
  }
}

processRodrigoRequest();