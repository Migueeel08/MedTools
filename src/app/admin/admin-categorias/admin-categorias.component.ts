import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-categorias.component.html',
  styleUrls: ['./admin-categorias.component.css']
})
export class AdminCategoriasComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';
  
  categorias: any[] = [];
  categoriasFiltradas: any[] = [];
  cargando = true;
  busqueda = '';
  
  // Modal de detalles
  modalVisible = false;
  categoriaSeleccionada: any = null;
  
  // Modal de crear/editar categoría
  modalFormVisible = false;
  modoEdicion = false;
  
  // ✅ NUEVO: Modal de subcategorías
  modalSubcategoriasVisible = false;
  modalSubcategoriaFormVisible = false;
  modoEdicionSubcategoria = false;
  subcategoriaSeleccionada: any = null;
  
  // Formulario categoría
  formulario = {
    nombre: ''
  };

  // ✅ NUEVO: Formulario subcategoría
  formularioSubcategoria = {
    nombre: '',
    descripcion: ''
  };
  
  // Estadísticas
  stats = {
    total: 0,
    conProductos: 0,
    sinProductos: 0
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.verificarAdmin();
    this.cargarCategorias();
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
   * Cargar todas las categorías
   */
  cargarCategorias() {
    this.cargando = true;
    
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: async (categorias) => {
        console.log('Categorías cargadas:', categorias);
        
        // Cargar subcategorías de todas las categorías
        const subcategoriasPromise = this.http.get<any[]>(`${this.apiUrl}/subcategorias`).toPromise();
        
        // Cargar cantidad de productos para cada categoría
        const categoriasConDatos = await Promise.all(
          categorias.map(async (categoria) => {
            try {
              // ✅ CORREGIDO: Usar /api/productos en lugar de /api/productos-venta
              const productos = await this.http.get<any[]>(
                `${this.apiUrl}/productos?categoria=${categoria.id_categoria}`
              ).toPromise();
              
              // Obtener subcategorías
              const todasSubcategorias = await subcategoriasPromise;
              const subcategorias = todasSubcategorias?.filter(
                (sub: any) => sub.id_categoria === categoria.id_categoria
              ) || [];
              
              return {
                ...categoria,
                cantidad_productos: productos?.length || 0,
                subcategorias: subcategorias,
                cantidad_subcategorias: subcategorias.length
              };
            } catch (error) {
              console.error(`Error cargando datos de categoría ${categoria.id_categoria}:`, error);
              return {
                ...categoria,
                cantidad_productos: 0,
                subcategorias: [],
                cantidad_subcategorias: 0
              };
            }
          })
        );
        
        this.categorias = categoriasConDatos;
        this.categoriasFiltradas = categoriasConDatos;
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargando = false;
        alert('Error al cargar categorías');
      }
    });
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas() {
    this.stats.total = this.categorias.length;
    // Nota: Si tu backend devuelve un campo "cantidad_productos", úsalo aquí
    this.stats.conProductos = this.categorias.filter(c => c.cantidad_productos > 0).length;
    this.stats.sinProductos = this.categorias.filter(c => !c.cantidad_productos || c.cantidad_productos === 0).length;
  }

  /**
   * Buscar categorías
   */
  buscarCategorias() {
    if (!this.busqueda.trim()) {
      this.categoriasFiltradas = this.categorias;
      return;
    }

    const busquedaLower = this.busqueda.toLowerCase();
    this.categoriasFiltradas = this.categorias.filter(c => 
      c.nombre?.toLowerCase().includes(busquedaLower) ||
      c.descripcion?.toLowerCase().includes(busquedaLower)
    );
  }

  /**
   * Ver detalles de categoría en modal
   */
  verDetalles(categoria: any) {
    this.categoriaSeleccionada = categoria;
    this.modalVisible = true;
  }

  /**
   * Cerrar modal de detalles
   */
  cerrarModal() {
    this.modalVisible = false;
    this.categoriaSeleccionada = null;
  }

  /**
   * Abrir modal para crear categoría
   */
  abrirModalCrear() {
    this.modoEdicion = false;
    this.limpiarFormulario();
    this.modalFormVisible = true;
  }

  /**
   * Abrir modal para editar categoría
   */
  abrirModalEditar(categoria: any) {
    this.modoEdicion = true;
    this.categoriaSeleccionada = categoria;
    this.formulario = {
      nombre: categoria.nombre
    };
    this.modalFormVisible = true;
  }

  /**
   * Cerrar modal de formulario
   */
  cerrarModalForm() {
    this.modalFormVisible = false;
    this.modoEdicion = false;
    this.categoriaSeleccionada = null;
    this.limpiarFormulario();
  }

  /**
   * Limpiar formulario
   */
  limpiarFormulario() {
    this.formulario = {
      nombre: ''
    };
  }

  /**
   * Guardar categoría (crear o editar)
   */
  guardarCategoria() {
    if (!this.formulario.nombre.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    if (this.modoEdicion) {
      // Editar categoría existente
      this.http.put(`${this.apiUrl}/categorias/${this.categoriaSeleccionada.id_categoria}`, this.formulario).subscribe({
        next: () => {
          alert('Categoría actualizada correctamente');
          this.cerrarModalForm();
          this.cargarCategorias();
        },
        error: (error) => {
          console.error('Error al actualizar categoría:', error);
          alert('Error al actualizar categoría');
        }
      });
    } else {
      // Crear nueva categoría
      this.http.post(`${this.apiUrl}/categorias`, this.formulario).subscribe({
        next: () => {
          alert('Categoría creada correctamente');
          this.cerrarModalForm();
          this.cargarCategorias();
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          alert('Error al crear categoría');
        }
      });
    }
  }

  /**
   * Eliminar categoría
   */
  eliminarCategoria(categoria: any) {
    if (categoria.cantidad_productos > 0) {
      alert(`No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${categoria.cantidad_productos} producto(s) asociado(s).`);
      return;
    }

    if (categoria.cantidad_subcategorias > 0) {
      alert(`No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${categoria.cantidad_subcategorias} subcategoría(s) asociada(s).`);
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`)) return;

    this.http.delete(`${this.apiUrl}/categorias/${categoria.id_categoria}`).subscribe({
      next: () => {
        this.categorias = this.categorias.filter(c => c.id_categoria !== categoria.id_categoria);
        this.buscarCategorias();
        this.calcularEstadisticas();
        alert('Categoría eliminada correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar categoría:', error);
        alert('Error al eliminar categoría');
      }
    });
  }

  /**
   * Volver al panel
   */
  volverPanel() {
    this.router.navigate(['/admin']);
  }

  // ========================================
  // ✅ GESTIÓN DE SUBCATEGORÍAS
  // ========================================

  /**
   * Abrir modal para gestionar subcategorías de una categoría
   */
  gestionarSubcategorias(categoria: any) {
    this.categoriaSeleccionada = categoria;
    this.modalSubcategoriasVisible = true;
  }

  /**
   * Cerrar modal de subcategorías
   */
  cerrarModalSubcategorias() {
    this.modalSubcategoriasVisible = false;
    this.categoriaSeleccionada = null;
  }

  /**
   * Abrir modal para crear subcategoría
   */
  abrirModalCrearSubcategoria() {
    this.modoEdicionSubcategoria = false;
    this.subcategoriaSeleccionada = null;
    this.formularioSubcategoria = {
      nombre: '',
      descripcion: ''
    };
    this.modalSubcategoriaFormVisible = true;
  }

  /**
   * Abrir modal para editar subcategoría
   */
  abrirModalEditarSubcategoria(subcategoria: any) {
    this.modoEdicionSubcategoria = true;
    this.subcategoriaSeleccionada = subcategoria;
    this.formularioSubcategoria = {
      nombre: subcategoria.nombre,
      descripcion: subcategoria.descripcion || ''
    };
    this.modalSubcategoriaFormVisible = true;
  }

  /**
   * Cerrar modal de formulario de subcategoría
   */
  cerrarModalSubcategoriaForm() {
    this.modalSubcategoriaFormVisible = false;
    this.modoEdicionSubcategoria = false;
    this.subcategoriaSeleccionada = null;
    this.formularioSubcategoria = {
      nombre: '',
      descripcion: ''
    };
  }

  /**
   * Guardar subcategoría (crear o editar)
   */
  guardarSubcategoria() {
    if (!this.formularioSubcategoria.nombre.trim()) {
      alert('El nombre de la subcategoría es obligatorio');
      return;
    }

    if (this.modoEdicionSubcategoria) {
      // Editar subcategoría existente
      this.http.put(
        `${this.apiUrl}/subcategorias/${this.subcategoriaSeleccionada.id_subcategoria}`,
        this.formularioSubcategoria
      ).subscribe({
        next: () => {
          alert('Subcategoría actualizada correctamente');
          this.cerrarModalSubcategoriaForm();
          this.cargarCategorias(); // Recargar para actualizar conteos
        },
        error: (error) => {
          console.error('Error al actualizar subcategoría:', error);
          alert('Error al actualizar subcategoría');
        }
      });
    } else {
      // Crear nueva subcategoría
      const nuevaSubcategoria = {
        ...this.formularioSubcategoria,
        id_categoria: this.categoriaSeleccionada.id_categoria
      };

      this.http.post(`${this.apiUrl}/subcategorias`, nuevaSubcategoria).subscribe({
        next: () => {
          alert('Subcategoría creada correctamente');
          this.cerrarModalSubcategoriaForm();
          this.cargarCategorias(); // Recargar para actualizar conteos
        },
        error: (error) => {
          console.error('Error al crear subcategoría:', error);
          alert('Error al crear subcategoría');
        }
      });
    }
  }

  /**
   * Eliminar subcategoría
   */
  eliminarSubcategoria(subcategoria: any) {
    if (!confirm(`¿Estás seguro de eliminar la subcategoría "${subcategoria.nombre}"?`)) return;

    this.http.delete(`${this.apiUrl}/subcategorias/${subcategoria.id_subcategoria}`).subscribe({
      next: () => {
        alert('Subcategoría eliminada correctamente');
        this.cargarCategorias(); // Recargar para actualizar conteos
      },
      error: (error) => {
        console.error('Error al eliminar subcategoría:', error);
        alert('Error al eliminar subcategoría. Puede que tenga productos asociados.');
      }
    });
  }
}