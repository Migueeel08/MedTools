import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-usuarios.component.html',
  styleUrls: ['./admin-usuarios.component.css']
})
export class AdminUsuariosComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';
  private baseUrl = 'http://localhost:8000'; // ✅ AGREGAR
  
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cargando = true;
  busqueda = '';
  
  // ✅ Modal de detalles
  modalVisible = false;
  usuarioSeleccionado: any = null;
  
  // Estadísticas
  stats = {
    total: 0,
    admins: 0,
    usuarios: 0
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.verificarAdmin();
    this.cargarUsuarios();
  }

  /**
   * Verificar que el usuario sea admin
   */
  verificarAdmin() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.rol !== 'admin') {
        alert('No tienes permisos de administrador');
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Cargar todos los usuarios
   */
  cargarUsuarios() {
    this.cargando = true;
    
    this.http.get<any[]>(`${this.apiUrl}/usuarios`).subscribe({
      next: (data) => {
        console.log('Usuarios cargados:', data);
        
        // ✅ Construir URL completa de imágenes
        this.usuarios = data.map(usuario => ({
          ...usuario,
          imagen: this.construirUrlImagen(usuario.imagen)
        }));
        
        this.usuariosFiltrados = this.usuarios;
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.cargando = false;
        alert('Error al cargar usuarios');
      }
    });
  }

  /**
   * ✅ Construir URL completa para imágenes
   */
  construirUrlImagen(imagen: string | null): string {
    if (!imagen) {
      return 'assets/img/profile.jpeg';
    }
    if (imagen.startsWith('http')) {
      return imagen;
    }
    if (imagen.startsWith('assets/')) {
      return imagen;
    }
    if (imagen.startsWith('/uploads')) {
      return `${this.baseUrl}${imagen}`;
    }
    if (imagen.startsWith('uploads')) {
      return `${this.baseUrl}/${imagen}`;
    }
    return 'assets/img/profile.jpeg';
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas() {
    this.stats.total = this.usuarios.length;
    this.stats.admins = this.usuarios.filter(u => u.rol === 'admin').length;
    this.stats.usuarios = this.usuarios.filter(u => u.rol === 'user').length;
  }

  /**
   * Buscar usuarios
   */
  buscarUsuarios() {
    if (!this.busqueda.trim()) {
      this.usuariosFiltrados = this.usuarios;
      return;
    }

    const busquedaLower = this.busqueda.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(u => 
      u.nombre?.toLowerCase().includes(busquedaLower) ||
      u.apellido?.toLowerCase().includes(busquedaLower) ||
      u.email?.toLowerCase().includes(busquedaLower)
    );
  }

  /**
   * Cambiar rol de usuario
   */
  cambiarRol(usuario: any) {
    const nuevoRol = usuario.rol === 'admin' ? 'user' : 'admin';
    const mensaje = nuevoRol === 'admin' 
      ? `¿Convertir a ${usuario.nombre} en administrador?`
      : `¿Quitar permisos de administrador a ${usuario.nombre}?`;

    if (!confirm(mensaje)) return;

    this.http.put(`${this.apiUrl}/usuarios/${usuario.id_usuario}`, {
      rol: nuevoRol
    }).subscribe({
      next: () => {
        usuario.rol = nuevoRol;
        this.calcularEstadisticas();
        alert(`Rol actualizado correctamente`);
      },
      error: (error) => {
        console.error('Error al cambiar rol:', error);
        alert('Error al cambiar rol del usuario');
      }
    });
  }

  /**
   * Eliminar usuario
   */
  eliminarUsuario(usuario: any) {
    if (usuario.rol === 'admin') {
      alert('No puedes eliminar a un administrador');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre}?`)) return;

    this.http.delete(`${this.apiUrl}/usuarios/${usuario.id_usuario}`).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(u => u.id_usuario !== usuario.id_usuario);
        this.buscarUsuarios();
        this.calcularEstadisticas();
        alert('Usuario eliminado correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        alert('Error al eliminar usuario');
      }
    });
  }

  /**
   * Ver detalles del usuario en modal
   */
  verDetalles(usuario: any) {
    this.usuarioSeleccionado = usuario;
    this.modalVisible = true;
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    this.modalVisible = false;
    this.usuarioSeleccionado = null;
  }

  /**
   * Volver al panel
   */
  volverPanel() {
    this.router.navigate(['/admin']);
  }
}