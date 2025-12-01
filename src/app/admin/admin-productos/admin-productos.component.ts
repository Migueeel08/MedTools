import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EditarProductoComponent } from './editar-producto/editar-producto.component';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, EditarProductoComponent],
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
  
  // ✅ AGREGAR ESTAS PROPIEDADES
  modalVisible = false;
  productoSeleccionado: any = null;
  
  // ✅ AGREGAR ESTAS PROPIEDADES FALTANTES
  modalEditarVisible = false;
  productoEditando: any = null;
  
  // ✅ Modal para crear
  modalCrearVisible = false;
  formularioProducto = {
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    id_categoria: 0,
    condicion: 'nuevo'
  };
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  
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

  cargarProductos() {
    this.cargando = true;
    this.http.get<any[]>(`${this.apiUrl}/productos`).subscribe({
      next: (data) => {
        console.log('✅ Productos cargados:', data);
        this.productos = data;
        this.productosFiltrados = data;
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.cargando = false;
        alert('Error al cargar productos');
      }
    });
  }

  cargarCategorias() {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
      }
    });
  }

  calcularEstadisticas() {
    this.stats.total = this.productos.length;
    this.stats.activos = this.productos.filter(p => p.estado === 'activo').length;
    this.stats.inactivos = this.productos.filter(p => p.estado === 'inactivo').length;
  }

  filtrarProductos() {
    let filtrados = this.productos;

    if (this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase();
      filtrados = filtrados.filter(p =>
        p.nombre?.toLowerCase().includes(busquedaLower) ||
        p.descripcion?.toLowerCase().includes(busquedaLower)
      );
    }

    if (this.categoriaFiltro) {
      filtrados = filtrados.filter(p => p.id_categoria == this.categoriaFiltro);
    }

    if (this.estadoFiltro) {
      filtrados = filtrados.filter(p => p.estado === this.estadoFiltro);
    }

    this.productosFiltrados = filtrados;
  }

  buscarProductos() {
    this.filtrarProductos();
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.categoriaFiltro = '';
    this.estadoFiltro = '';
    this.productosFiltrados = this.productos;
  }

  getNombreCategoria(idCategoria: number): string {
    const categoria = this.categorias.find(c => c.id_categoria === idCategoria);
    return categoria?.nombre || 'Sin categoría';
  }

  // ✅ AGREGAR ESTOS MÉTODOS
  verDetalles(producto: any) {
    this.productoSeleccionado = producto;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.productoSeleccionado = null;
  }

  // ✅ AGREGAR MÉTODOS PARA MODAL DE CREAR
  abrirModalCrear() {
    this.modalCrearVisible = true;
    this.formularioProducto = {
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      id_categoria: 0,
      condicion: 'nuevo'
    };
    this.imagenSeleccionada = null;
    this.imagenPreview = null;
  }

  cerrarModalCrear() {
    this.modalCrearVisible = false;
    this.imagenSeleccionada = null;
    this.imagenPreview = null;
  }

  seleccionarImagenCrear(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  crearProducto() {
    if (!this.validarFormularioCrear()) return;

    if (!this.imagenSeleccionada) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', this.formularioProducto.nombre);
    formData.append('descripcion', this.formularioProducto.descripcion);
    formData.append('precio', this.formularioProducto.precio.toString());
    formData.append('stock', this.formularioProducto.stock.toString());
    formData.append('id_categoria', this.formularioProducto.id_categoria.toString());
    formData.append('condicion', this.formularioProducto.condicion);
    formData.append('imagen', this.imagenSeleccionada);
    formData.append('estado', 'activo');

    this.http.post(`${this.apiUrl}/productos`, formData).subscribe({
      next: (response) => {
        console.log('✅ Producto creado:', response);
        alert('Producto creado exitosamente');
        this.cerrarModalCrear();
        this.cargarProductos();
      },
      error: (error) => {
        console.error('❌ Error:', error);
        alert('Error al crear producto: ' + (error.error?.detail || error.message));
      }
    });
  }

  validarFormularioCrear(): boolean {
    if (!this.formularioProducto.nombre.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (this.formularioProducto.precio <= 0) {
      alert('El precio debe ser mayor a 0');
      return false;
    }
    if (this.formularioProducto.stock < 0) {
      alert('El stock no puede ser negativo');
      return false;
    }
    if (!this.formularioProducto.id_categoria) {
      alert('Debes seleccionar una categoría');
      return false;
    }
    return true;
  }

  // ✅ AGREGAR MÉTODO PARA ABRIR MODAL DE EDICIÓN
  abrirModalEditar(producto: any) {
    this.productoEditando = producto;
    this.modalEditarVisible = true;
  }

  // ✅ AGREGAR MÉTODO PARA CERRAR MODAL DE EDICIÓN
  cerrarModalEditar() {
    this.modalEditarVisible = false;
    this.productoEditando = null;
    this.cargarProductos();
  }

  cambiarEstado(producto: any) {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';
    
    if (!confirm(`¿Estás seguro de cambiar el estado a ${nuevoEstado}?`)) return;

    this.http.put(`${this.apiUrl}/productos/${producto.id_producto}`, {
      estado: nuevoEstado
    }).subscribe({
      next: () => {
        console.log('✅ Estado actualizado');
        producto.estado = nuevoEstado;
        this.calcularEstadisticas();
        alert('Estado actualizado');
      },
      error: (error) => {
        console.error('❌ Error:', error);
        alert('Error al actualizar estado');
      }
    });
  }

  eliminarProducto(producto: any) {
    if (!confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) return;

    this.http.delete(`${this.apiUrl}/productos/${producto.id_producto}`).subscribe({
      next: () => {
        console.log('✅ Producto eliminado');
        alert('Producto eliminado');
        this.cargarProductos();
      },
      error: (error) => {
        console.error('❌ Error:', error);
        alert('Error al eliminar producto');
      }
    });
  }

  volverPanel() {
    this.router.navigate(['/admin']);
  }
}