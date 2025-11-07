import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';
  
  adminNombre = '';
  adminEmail = '';
  
  stats = {
    totalUsuarios: 0,
    totalProductos: 0,
    totalCategorias: 0,
    totalVentas: 0
  };
  
  cargando = true;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.verificarAdmin();
    this.cargarDatosAdmin();
    this.cargarEstadisticas();
  }

  /**
   * Verificar que el usuario sea admin
   */
  verificarAdmin() {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        // Verificar que sea admin
        if (user.rol !== 'admin') {
          alert('No tienes permisos de administrador');
          this.router.navigate(['/']);
          return;
        }
        
        this.adminNombre = user.nombre;
        this.adminEmail = user.email;
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Cargar datos del administrador
   */
  cargarDatosAdmin() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.adminNombre = user.nombre;
      this.adminEmail = user.email;
    }
  }

  /**
   * Cargar estadísticas del sistema
   */
  cargarEstadisticas() {
    this.cargando = true;
    
    // Cargar total de usuarios
    this.http.get<any[]>(`${this.apiUrl}/usuarios`).subscribe({
      next: (data) => {
        this.stats.totalUsuarios = data.length;
      },
      error: (error) => console.error('Error al cargar usuarios:', error)
    });
    
    // Cargar total de productos
    this.http.get<any[]>(`${this.apiUrl}/productos`).subscribe({
      next: (data) => {
        this.stats.totalProductos = data.length;
      },
      error: (error) => console.error('Error al cargar productos:', error)
    });
    
    // Cargar total de categorías
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => {
        this.stats.totalCategorias = data.length;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargando = false;
      }
    });
  }

  /**
   * Navegar a gestión de usuarios
   */
  irAUsuarios() {
    this.router.navigate(['/admin/usuarios']);
  }

  /**
   * Navegar a gestión de productos
   */
  irAProductos() {
    this.router.navigate(['/admin/productos']);
  }

  /**
   * Navegar a gestión de categorías
   */
  irACategorias() {
    this.router.navigate(['/admin/categorias']);
  }

  /**
   * Volver al inicio (tienda)
   */
  volverInicio() {
    this.router.navigate(['/']);
  }

  /**
   * Cerrar sesión
   */
  logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      this.router.navigate(['/login']);
    }
  }
}