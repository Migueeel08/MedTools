import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userData = localStorage.getItem('user');
  
  console.log('🔐 authGuard ejecutado para ruta:', state.url);
  console.log('📦 userData en localStorage:', userData ? 'SÍ existe' : 'NO existe');
  
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      console.log('✅ Usuario autenticado:', parsed.nombre || parsed.email);
      console.log('✅ Acceso permitido a:', state.url);
      return true;
    } catch (error) {
      console.error('❌ Error al parsear userData:', error);
      console.warn('🔄 Redirigiendo a login por error de parsing');
      localStorage.removeItem('user'); // Limpiar datos corruptos
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }
  
  console.warn('⛔ Acceso denegado - No hay usuario logueado');
  console.warn('🔄 Redirigiendo a login desde:', state.url);
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};