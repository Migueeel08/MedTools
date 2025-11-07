import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';

  user: any = {
    id: null,
    nombre: 'Usuario',
    email: '',
    imagen: 'assets/img/profile.jpeg',
  };

  productosVendiendo: any[] = [];
  productosVendidos: any[] = [];
  compras: any[] = [];

  tabSeleccionado: 'vendiendo' | 'vendidos' | 'compras' = 'vendiendo';
  cargando = false;

  // ✅ Modal de gestión de producto
  modalGestionVisible = false;
  productoSeleccionado: any = null;
  
  // ✅ Modal de editar stock
  modalStockVisible = false;
  nuevoStock = 0;

  // ✅ NUEVO: Modal de editar información del producto
  modalEditarVisible = false;
  formularioEdicion = {
    nombre: '',
    descripcion: '',
    precio: 0,
    categoria: '',
    condicion: 'nuevo',
    color: '',
    talla: '',
    marca: ''
  };

  categorias: any[] = [];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.cargarUsuario();
    this.cargarProductosDelUsuario();
    this.cargarCategorias();
    
    window.addEventListener('storage', () => {
      this.cargarUsuario();
      this.cargarProductosDelUsuario();
    });
  }

  cargarUsuario() {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        this.user.id = parsed.id;
        this.user.nombre =
          parsed.nombre ||
          parsed.firstName ||
          parsed.username ||
          (parsed.email ? parsed.email.split('@')[0] : 'Usuario');
        this.user.email = parsed.email || '';
        this.user.imagen = this.obtenerUrlImagen(parsed.imagen);
        
        console.log('Usuario cargado en perfil:', this.user);
      } catch (e) {
        console.error('Error cargando usuario:', e);
      }
    }
  }

  cargarCategorias() {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
      }
    });
  }

  cargarProductosDelUsuario() {
    if (!this.user.id) {
      console.warn('No hay ID de usuario disponible');
      return;
    }

    this.cargando = true;

    this.http.get<any[]>(`${this.apiUrl}/productos/usuario/${this.user.id}/vendiendo`)
      .subscribe({
        next: (productos) => {
          this.productosVendiendo = productos.map(p => this.normalizarProducto(p));
          console.log('Productos en venta:', this.productosVendiendo);
        },
        error: (error) => {
          console.error('Error cargando productos en venta:', error);
          this.productosVendiendo = [];
        }
      });

    this.http.get<any[]>(`${this.apiUrl}/productos/usuario/${this.user.id}/vendidos`)
      .subscribe({
        next: (productos) => {
          this.productosVendidos = productos.map(p => this.normalizarProducto(p));
          console.log('Productos vendidos:', this.productosVendidos);
        },
        error: (error) => {
          console.error('Error cargando productos vendidos:', error);
          this.productosVendidos = [];
        }
      });

    this.http.get<any[]>(`${this.apiUrl}/productos/usuario/${this.user.id}/compras`)
      .subscribe({
        next: (productos) => {
          this.compras = productos.map(p => this.normalizarProducto(p));
          console.log('Compras:', this.compras);
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando compras:', error);
          this.compras = [];
          this.cargando = false;
        }
      });
  }

  normalizarProducto(producto: any): any {
    return {
      id: producto.id_producto || producto.id,
      id_producto: producto.id_producto || producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: this.obtenerUrlImagenProducto(producto.imagen),
      categoria: producto.categoria,
      id_categoria: producto.id_categoria,
      vendedor: producto.vendedor || producto.usuario?.nombre,
      estado: producto.estado,
      fecha_venta: producto.fecha_venta || producto.fecha_vendido,
      cantidad_disponible: producto.cantidad_disponible || 0,
      descripcion: producto.descripcion || '',
      condicion: producto.condicion || 'nuevo',
      color: producto.color || '',
      talla: producto.talla || '',
      marca: producto.marca || ''
    };
  }

  obtenerUrlImagenProducto(imagenPath: string | null | undefined): string {
    const apiUrl = 'http://localhost:8000';
    const defaultImage = 'assets/img/producto-default.jpg';
    
    if (!imagenPath || imagenPath.trim() === '') return defaultImage;
    if (imagenPath.startsWith('http://') || imagenPath.startsWith('https://')) return imagenPath;
    if (imagenPath.startsWith('assets/')) return imagenPath;
    if (imagenPath.startsWith('/uploads')) return `${apiUrl}${imagenPath}`;
    if (imagenPath.startsWith('data:image')) return imagenPath;
    
    return defaultImage;
  }

  obtenerUrlImagen(imagenPath: string | null | undefined): string {
    const apiUrl = 'http://localhost:8000';
    const defaultImage = 'assets/img/profile.jpeg';
    
    if (!imagenPath || imagenPath.trim() === '') return defaultImage;
    if (imagenPath.startsWith('http://') || imagenPath.startsWith('https://')) return imagenPath;
    if (imagenPath.startsWith('assets/')) return imagenPath;
    if (imagenPath.startsWith('/uploads')) return `${apiUrl}${imagenPath}`;
    if (imagenPath.startsWith('data:image')) return imagenPath;
    
    return defaultImage;
  }

  editarPerfil() {
    this.router.navigate(['/perfil/editar']);
  }

  volverInicio() {
    this.router.navigate(['/']);
  }

  seleccionarTab(tab: 'vendiendo' | 'vendidos' | 'compras') {
    this.tabSeleccionado = tab;
  }

  obtenerProductosActivos() {
    switch (this.tabSeleccionado) {
      case 'vendiendo': return this.productosVendiendo;
      case 'vendidos': return this.productosVendidos;
      case 'compras': return this.compras;
      default: return [];
    }
  }

  verDetalleProducto(producto: any) {
    if (this.tabSeleccionado === 'vendiendo') {
      this.abrirModalGestion(producto);
    } else {
      this.router.navigate(['/producto', producto.id]);
    }
  }

  irAVender() {
    this.router.navigate(['/vender']);
  }

  explorarProductos() {
    this.router.navigate(['/']);
  }

  // ========================================
  // GESTIÓN DE PRODUCTOS EN VENTA
  // ========================================

  abrirModalGestion(producto: any) {
    this.productoSeleccionado = producto;
    this.modalGestionVisible = true;
  }

  cerrarModalGestion() {
    this.modalGestionVisible = false;
    this.productoSeleccionado = null;
  }

  abrirModalStock() {
    this.nuevoStock = this.productoSeleccionado?.cantidad_disponible || 0;
    this.modalStockVisible = true;
    this.modalGestionVisible = false;
  }

  cerrarModalStock() {
    this.modalStockVisible = false;
    this.modalGestionVisible = true;
  }

  guardarStock() {
    if (!this.productoSeleccionado) return;

    const actualizacion = {
      cantidad_disponible: this.nuevoStock
    };

    this.http.put(
      `${this.apiUrl}/productos/${this.productoSeleccionado.id_producto}`,
      actualizacion
    ).subscribe({
      next: () => {
        alert('Stock actualizado correctamente');
        this.cerrarModalStock();
        this.cerrarModalGestion();
        this.cargarProductosDelUsuario();
      },
      error: (error) => {
        console.error('Error actualizando stock:', error);
        alert('Error al actualizar el stock');
      }
    });
  }

  editarProducto() {
    if (!this.productoSeleccionado) return;
    
    // Llenar formulario con datos actuales
    this.formularioEdicion = {
      nombre: this.productoSeleccionado.nombre || '',
      descripcion: this.productoSeleccionado.descripcion || '',
      precio: this.productoSeleccionado.precio || 0,
      categoria: this.productoSeleccionado.id_categoria || '',
      condicion: this.productoSeleccionado.condicion || 'nuevo',
      color: this.productoSeleccionado.color || '',
      talla: this.productoSeleccionado.talla || '',
      marca: this.productoSeleccionado.marca || ''
    };
    
    this.modalEditarVisible = true;
    this.modalGestionVisible = false;
  }

  /**
   * Cerrar modal de editar producto
   */
  cerrarModalEditar() {
    this.modalEditarVisible = false;
    this.modalGestionVisible = true;
  }

  /**
   * Guardar cambios del producto
   */
  guardarCambiosProducto() {
    if (!this.productoSeleccionado) return;

    if (!this.formularioEdicion.nombre.trim()) {
      alert('El nombre del producto es obligatorio');
      return;
    }

    if (this.formularioEdicion.precio <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    const actualizacion = {
      nombre: this.formularioEdicion.nombre,
      descripcion: this.formularioEdicion.descripcion,
      precio: this.formularioEdicion.precio,
      id_categoria: this.formularioEdicion.categoria,
      condicion: this.formularioEdicion.condicion,
      color: this.formularioEdicion.color,
      talla: this.formularioEdicion.talla,
      marca: this.formularioEdicion.marca
    };

    this.http.put(
      `${this.apiUrl}/productos/${this.productoSeleccionado.id_producto}`,
      actualizacion
    ).subscribe({
      next: () => {
        alert('Producto actualizado correctamente');
        this.cerrarModalEditar();
        this.cerrarModalGestion();
        this.cargarProductosDelUsuario();
      },
      error: (error) => {
        console.error('Error actualizando producto:', error);
        alert('Error al actualizar el producto');
      }
    });
  }

  eliminarProducto() {
    if (!this.productoSeleccionado) return;

    if (!confirm(`¿Estás seguro de eliminar "${this.productoSeleccionado.nombre}"?`)) {
      return;
    }

    this.http.delete(`${this.apiUrl}/productos/${this.productoSeleccionado.id_producto}`)
      .subscribe({
        next: () => {
          alert('Producto eliminado correctamente');
          this.cerrarModalGestion();
          this.cargarProductosDelUsuario();
        },
        error: (error) => {
          console.error('Error eliminando producto:', error);
          alert('Error al eliminar el producto');
        }
      });
  }
}