import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-productos.component.html',
  styleUrls: ['./admin-productos.component.css']
})
export class AdminProductosComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';
  private baseUrl = 'http://localhost:8000';
  
  productos: any[] = [];
  productosFiltrados: any[] = [];
  categorias: any[] = [];
  cargando = true;
  busqueda = '';
  categoriaFiltro = '';
  estadoFiltro = '';
  
  // Modal de detalles
  modalVisible = false;
  productoSeleccionado: any = null;
  
  // Estadísticas
  stats = {
    total: 0,
    activos: 0,
    inactivos: 0
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.verificarAdmin();
    this.cargarCategorias();
    this.cargarProductos();
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
   * Cargar categorías
   */
  cargarCategorias() {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  /**
   * Cargar todos los productos
   */
  cargarProductos() {
    this.cargando = true;
    
    // ✅ CORREGIDO: Usar /api/productos en lugar de /api/productos-venta
    this.http.get<any[]>(`${this.apiUrl}/productos`).subscribe({
      next: (data) => {
        console.log('Productos cargados:', data);
        
        // Construir URL completa de imágenes
        this.productos = data.map(producto => ({
          ...producto,
          imagen: this.construirUrlImagen(producto.imagen),
          precio: parseFloat(producto.precio || 0)
        }));
        
        this.productosFiltrados = this.productos;
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.cargando = false;
        alert('Error al cargar productos');
      }
    });
  }

  /**
   * Construir URL completa para imágenes
   */
  construirUrlImagen(imagen: string | null): string {
    if (!imagen) {
      return 'assets/img/no-image.png';
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
    return 'assets/img/no-image.png';
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas() {
    this.stats.total = this.productos.length;
    this.stats.activos = this.productos.filter(p => p.estado === 'activo').length;
    this.stats.inactivos = this.productos.filter(p => p.estado === 'inactivo').length;
  }

  /**
   * Buscar y filtrar productos
   */
  filtrarProductos() {
    let filtrados = [...this.productos];

    // Filtrar por búsqueda
    if (this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombre?.toLowerCase().includes(busquedaLower) ||
        p.descripcion?.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtrar por categoría
    if (this.categoriaFiltro) {
      filtrados = filtrados.filter(p => p.id_categoria === parseInt(this.categoriaFiltro));
    }

    // Filtrar por estado
    if (this.estadoFiltro) {
      filtrados = filtrados.filter(p => p.estado === this.estadoFiltro);
    }

    this.productosFiltrados = filtrados;
  }

  /**
   * Obtener nombre de categoría
   */
  getNombreCategoria(idCategoria: number): string {
    const categoria = this.categorias.find(c => c.id_categoria === idCategoria);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  /**
   * Cambiar estado del producto
   */
  cambiarEstado(producto: any) {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';
    const mensaje = nuevoEstado === 'activo' 
      ? `¿Activar el producto "${producto.nombre}"?`
      : `¿Desactivar el producto "${producto.nombre}"?`;

    if (!confirm(mensaje)) return;

    this.http.put(`${this.apiUrl}/productos/${producto.id_producto}`, {
      estado: nuevoEstado
    }).subscribe({
      next: () => {
        producto.estado = nuevoEstado;
        this.calcularEstadisticas();
        alert('Estado actualizado correctamente');
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar estado del producto');
      }
    });
  }

  /**
   * Eliminar producto
   */
  eliminarProducto(producto: any) {
    if (!confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) return;

    this.http.delete(`${this.apiUrl}/productos/${producto.id_producto}`).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id_producto !== producto.id_producto);
        this.filtrarProductos();
        this.calcularEstadisticas();
        alert('Producto eliminado correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar producto');
      }
    });
  }

  /**
   * Ver detalles del producto en modal
   */
  verDetalles(producto: any) {
    this.productoSeleccionado = producto;
    this.modalVisible = true;
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    this.modalVisible = false;
    this.productoSeleccionado = null;
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros() {
    this.busqueda = '';
    this.categoriaFiltro = '';
    this.estadoFiltro = '';
    this.filtrarProductos();
  }

  /**
   * Volver al panel
   */
  volverPanel() {
    this.router.navigate(['/admin']);
  }

  /**
   * Editar producto
   */
  editarProducto(producto: any) {
    // TODO: Implementar edición de producto
    alert('Funcionalidad de edición en desarrollo');
  }
}