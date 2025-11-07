import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userData = localStorage.getItem('user');
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.rol === 'admin') {
        return true;
      }
    } catch (error) {
      console.error('Error al parsear usuario:', error);
    }
  }
  
  alert('No tienes permisos de administrador');
  router.navigate(['/']);
  return false;
};