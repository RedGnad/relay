import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware pour gérer les requêtes CORS
 * Ce middleware s'exécute avant que les requêtes atteignent vos API routes
 * et ajoute les en-têtes nécessaires pour permettre les requêtes cross-origin (CORS)
 */
export function middleware(req: NextRequest) {
  // Créer une réponse basée sur la requête originale qui sera transmise à l'API
  const response = NextResponse.next();

  // Ajouter les en-têtes CORS à la réponse
  // Access-Control-Allow-Origin: * permet à n'importe quel domaine de faire des requêtes
  response.headers.set('Access-Control-Allow-Origin', '*');
  
  // Méthodes HTTP autorisées
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  
  // En-têtes de requête autorisés
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Durée pendant laquelle les résultats de la requête preflight peuvent être mis en cache (en secondes)
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 heures

  // Pour les requêtes OPTIONS (preflight), renvoyer une réponse 200 immédiatement
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: response.headers
    });
  }

  // Journaliser les requêtes pour le débogage
  console.log(`Middleware interceptant: ${req.method} ${req.url}`);
  
  return response;
}

/**
 * Configuration indiquant sur quelles routes ce middleware doit s'exécuter
 * Ici, uniquement sur les routes commençant par /api/
 */
export const config = {
  matcher: '/api/:path*',
};
