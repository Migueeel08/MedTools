import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { MetodosPagoService } from '../services/metodos-pago.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './configuracionperfil.component.html',
  styleUrls: ['./configuracionperfil.component.css'],
})
export class ConfiguracionComponent implements OnInit {
  usuario: any = null;
  metodoPago: any = null;
  direcciones: any[] = [];
  direccionPrincipal: any = null;
  cargando = true;
  cargandoDirecciones = true;
  
  // ✅ NUEVO: Variables para el modal
  mostrarModal = false;
  eliminandoDireccion = false;

  constructor(
    private usuarioService: UsuariosService,
    private metodosPagoService: MetodosPagoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userString = localStorage.getItem('user');
    let email: string | null = null;

    if (userString) {
      const user = JSON.parse(userString);
      this.usuario = {
        id: user.id || user.id_usuario,
        id_usuario: user.id || user.id_usuario,
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || '',
        lada: user.lada || '+52',
        imagen: this.obtenerUrlImagen(user.imagen),
        direccion: user.direccion || '',
        tarjeta: user.tarjeta || '',
        tipo_tarjeta: user.tipo_tarjeta || '',
        rol: user.rol || 'user'
      };
      email = user.email;
      this.cargando = false;
    }

    if (!email) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioService.obtenerUsuarioPorEmail(email).subscribe({
      next: (data: any) => {
        const userId = data.id || data.id_usuario || this.usuario.id;
        
        this.usuario = {
          id: userId,
          id_usuario: userId,
          nombre: data.nombre || this.usuario.nombre,
          apellido: data.apellido || this.usuario.apellido,
          email: data.email || this.usuario.email,
          telefono: data.telefono || this.usuario.telefono,
          lada: data.lada || this.usuario.lada || '+52',
          imagen: this.obtenerUrlImagen(data.imagen) || this.usuario.imagen,
          direccion: data.direccion || this.usuario.direccion,
          tarjeta: data.tarjeta || this.usuario.tarjeta,
          tipo_tarjeta: data.tipo_tarjeta || this.usuario.tipo_tarjeta,
          rol: data.rol || this.usuario.rol || 'user'
        };
        this.cargando = false;

        console.log('💾 Guardando usuario completo:', this.usuario);
        localStorage.setItem('user', JSON.stringify(this.usuario));
        this.usuarioService.setUsuarioActual(this.usuario);

        this.cargarDirecciones();
        this.cargarMetodoPago();
      },
      error: (err: any) => {
        console.error('Error cargando usuario desde backend:', err);
        this.cargando = false;
        this.cargandoDirecciones = false;
      }
    });
  }

  cargarDirecciones(): void {
    if (!this.usuario?.id && !this.usuario?.id_usuario) {
      this.cargandoDirecciones = false;
      return;
    }

    const userId = this.usuario.id || this.usuario.id_usuario;

    this.usuarioService.obtenerDirecciones(userId).subscribe({
      next: (direcciones: any[]) => {
        console.log('📍 Direcciones cargadas:', direcciones);
        this.direcciones = direcciones || [];
        
        if (this.direcciones.length > 0) {
          this.direccionPrincipal = this.direcciones[0];
        }
        
        this.cargandoDirecciones = false;
      },
      error: (err) => {
        console.log('ℹ️ No hay direcciones guardadas o error:', err);
        this.direcciones = [];
        this.direccionPrincipal = null;
        this.cargandoDirecciones = false;
      }
    });
  }

  cargarMetodoPago(): void {
    if (!this.usuario?.id && !this.usuario?.id_usuario) {
      return;
    }

    const userId = this.usuario.id || this.usuario.id_usuario;

    this.metodosPagoService.obtenerMetodosPago(userId).subscribe({
      next: (metodos: any[]) => {
        if (metodos && metodos.length > 0) {
          this.metodoPago = metodos.find(m => m.es_predeterminado === 1) || metodos[0];
          console.log('💳 Método de pago cargado:', this.metodoPago);
        }
      },
      error: (err) => {
        console.log('ℹ️ No hay métodos de pago guardados o error:', err);
      }
    });
  }

  // ✅ NUEVO: Abrir modal de direcciones
  abrirModalDirecciones(): void {
    this.mostrarModal = true;
  }

  // ✅ NUEVO: Cerrar modal
  cerrarModal(): void {
    this.mostrarModal = false;
  }

  // ✅ NUEVO: Seleccionar dirección como principal
  seleccionarDireccionPrincipal(direccion: any): void {
    this.direccionPrincipal = direccion;
    console.log('📍 Dirección principal actualizada:', direccion);
    this.cerrarModal();
  }

  // ✅ NUEVO: Editar una dirección específica
  editarDireccionEspecifica(direccion: any): void {
    // Puedes navegar a la página de edición con el ID de la dirección
    this.router.navigate(['/perfil/editar-direccion'], {
      queryParams: { id: direccion.id_direccion }
    });
  }

  // ✅ NUEVO: Eliminar dirección
  eliminarDireccion(direccion: any, event: Event): void {
    event.stopPropagation(); // Evitar que se seleccione al hacer clic en eliminar
    
    if (!confirm(`¿Estás seguro de eliminar la dirección:\n${direccion.calle} #${direccion.numero_exterior}, ${direccion.colonia}?`)) {
      return;
    }

    this.eliminandoDireccion = true;

    this.usuarioService.eliminarDireccion(direccion.id_direccion).subscribe({
      next: () => {
        console.log('🗑️ Dirección eliminada:', direccion.id_direccion);
        
        // Remover de la lista
        this.direcciones = this.direcciones.filter(d => d.id_direccion !== direccion.id_direccion);
        
        // Si era la principal, seleccionar otra
        if (this.direccionPrincipal?.id_direccion === direccion.id_direccion) {
          this.direccionPrincipal = this.direcciones.length > 0 ? this.direcciones[0] : null;
        }
        
        this.eliminandoDireccion = false;
        
        // Mensaje de éxito
        alert('Dirección eliminada correctamente');
      },
      error: (err) => {
        console.error('❌ Error al eliminar dirección:', err);
        this.eliminandoDireccion = false;
        alert('No se pudo eliminar la dirección. Intenta nuevamente.');
      }
    });
  }

  // ✅ NUEVO: Formatear dirección corta
  formatearDireccionCorta(direccion: any): string {
    return `${direccion.calle} #${direccion.numero_exterior}, ${direccion.colonia}, ${direccion.ciudad}`;
  }

  // ✅ NUEVO: Formatear dirección completa
  formatearDireccionCompleta(direccion: any): string {
    let dir = `${direccion.calle} #${direccion.numero_exterior}`;
    
    if (direccion.numero_interior) {
      dir += `, Int ${direccion.numero_interior}`;
    }
    
    dir += `, ${direccion.colonia}`;
    dir += `, CP ${direccion.codigo_postal}`;
    dir += `, ${direccion.ciudad}, ${direccion.estado}`;
    dir += `, ${direccion.pais}`;
    
    if (direccion.referencias) {
      dir += ` | Ref: ${direccion.referencias}`;
    }
    
    return dir;
  }

  get tieneDireccion(): boolean {
    return this.direcciones.length > 0 || 
           (this.usuario?.direccion && this.usuario.direccion.trim() !== '');
  }

  get numeroTarjeta(): string {
    if (this.metodoPago?.ultimos_digitos) {
      return `**** **** **** ${this.metodoPago.ultimos_digitos}`;
    }
    if (this.usuario?.tarjeta) {
      return `**** **** **** ${this.usuario.tarjeta}`;
    }
    return '**** **** **** 0000';
  }

  get tipoTarjeta(): string {
    if (this.metodoPago?.tipo_tarjeta) {
      return this.metodoPago.tipo_tarjeta;
    }
    return this.usuario?.tipo_tarjeta || 'VISA';
  }

  get colorTarjeta(): string {
    if (this.metodoPago?.color_tarjeta) {
      return this.metodoPago.color_tarjeta;
    }
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  get bancoTarjeta(): string {
    return this.metodoPago?.banco || '';
  }

  get titularTarjeta(): string {
    if (this.metodoPago?.nombre_titular) {
      return this.metodoPago.nombre_titular;
    }
    return `${this.usuario?.nombre || ''} ${this.usuario?.apellido || ''}`.trim().toUpperCase();
  }

  obtenerUrlImagen(imagen: string | null | undefined): string {
    if (!imagen || imagen.trim() === '') {
      return 'assets/img/avatar.png';
    }

    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return imagen;
    }

    if (imagen.startsWith('/') || imagen.startsWith('uploads/')) {
      const baseUrl = 'http://localhost:8000';
      return `${baseUrl}${imagen.startsWith('/') ? imagen : '/' + imagen}`;
    }

    if (imagen.startsWith('assets/')) {
      return imagen;
    }

    return 'assets/img/avatar.png';
  }

  editarCuenta() {
    this.router.navigate(['/perfil/editar'], { 
      queryParams: { seccion: 'cuenta' } 
    });
  }

  editarDireccion() {
    this.router.navigate(['/perfil/editar-direccion']);
  }

  editarPago() {
    this.router.navigate(['/perfil/editar-pago']);
  }

  volver() {
    this.router.navigate(['/inicio']);
  }

  cerrarSesion() { 
    localStorage.clear(); 
    this.router.navigate(['/login']); 
  }
}