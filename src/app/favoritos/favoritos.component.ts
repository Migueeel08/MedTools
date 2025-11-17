import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Producto {
  id_producto: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: string;
  subcategoria: string;
  disponible: boolean;
  cantidad_disponible: number;
  marca: string | null;
  calificacion: number;
  reviews: number;
  descuento: number;
  precio_anterior: number | null;
  vendedor_nombre: string;
  id_vendedor: number;
}

interface Favorito {
  id_favorito: number;
  id_usuario: number;
  id_producto: number;
  fecha_agregado: string;
  producto: Producto;
}

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent implements OnInit, OnDestroy {

  // ===== API =====
  private apiUrl = 'http://localhost:8000/api';

  // ===== DATOS =====
  favoritos: Favorito[] = [];
  favoritosFiltrados: Favorito[] = [];
  contadorFavoritos: number = 0;
  contadorCarrito: number = 0;

  // ===== ESTADO =====
  cargando: boolean = false;
  filtroActivo: string = 'todos';
  busqueda: string = '';
  mostrarModalConfirmacion: boolean = false;

  // ===== USUARIO =====
  userId: number = 0;
  userName: string = '';
  userImage: string = 'assets/img/user-icon.png';
  userMenuOpen: boolean = false;
  isLoggedIn: boolean = false;

  private storageListener = (event: StorageEvent) => {
    if (event.key === 'user' || event.key === null) {
      this.verificarUsuario();
    }
  };

  private favoritosListener = () => {
    this.cargarFavoritos();
  };

  private carritoListener = () => {
    this.cargarContadorCarrito();
  };

  constructor(private router: Router, private http: HttpClient) {
    console.log('🔧 FavoritosComponent Constructor');
  }

  ngOnInit() {
    console.log('🚀 FavoritosComponent ngOnInit');
    this.verificarUsuario();
    
    if (this.userId) {
      this.cargarFavoritos();
      this.cargarContadorCarrito();
    }

    window.addEventListener('storage', this.storageListener);
    window.addEventListener('favoritosActualizado', this.favoritosListener as EventListener);
    window.addEventListener('carritoActualizado', this.carritoListener as EventListener);
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.storageListener);
    window.removeEventListener('favoritosActualizado', this.favoritosListener as EventListener);
    window.removeEventListener('carritoActualizado', this.carritoListener as EventListener);
  }

  // ===== VERIFICAR USUARIO =====
  verificarUsuario() {
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      this.userId = parsed.id;
      this.isLoggedIn = true;
      this.userName = parsed.nombre || parsed.firstName || parsed.username || 'Usuario';
      this.userImage = parsed.imagen && parsed.imagen.trim() !== '' 
        ? parsed.imagen 
        : 'assets/img/profile.jpeg';
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      this.router.navigate(['/login']);
    }
  }

  // ===== CARGAR FAVORITOS =====
  cargarFavoritos() {
    if (!this.userId) return;

    this.cargando = true;
    const url = `${this.apiUrl}/favoritos?id_usuario=${this.userId}`;

    this.http.get<Favorito[]>(url).subscribe({
      next: (data) => {
        this.favoritos = data.map(fav => ({
          ...fav,
          producto: {
            ...fav.producto,
            imagen: this.construirUrlImagen(fav.producto.imagen)
          }
        }));
        
        this.contadorFavoritos = this.favoritos.length;
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar favoritos:', error);
        this.favoritos = [];
        this.contadorFavoritos = 0;
        this.cargando = false;
      }
    });
  }

  // ===== CONSTRUIR URL DE IMAGEN =====
  construirUrlImagen(imagen: string | null): string {
    if (!imagen) return 'assets/img/producto-default.jpg';
    if (imagen.startsWith('http')) return imagen;
    if (imagen.startsWith('assets/')) return imagen;
    if (imagen.startsWith('data:image')) return imagen;
    if (imagen.startsWith('/uploads/')) return `http://localhost:8000${imagen}`;
    return 'assets/img/producto-default.jpg';
  }

  // ===== CARGAR CONTADOR DEL CARRITO =====
  cargarContadorCarrito() {
    if (!this.userId) return;
    
    this.http.get<any>(`${this.apiUrl}/carrito/count?id_usuario=${this.userId}`).subscribe({
      next: (data) => {
        this.contadorCarrito = data.total_productos || 0;
      },
      error: (error) => {
        console.error('Error al cargar contador del carrito:', error);
        this.contadorCarrito = 0;
      }
    });
  }

  // ===== CAMBIAR FILTRO =====
  cambiarFiltro(filtro: string) {
    this.filtroActivo = filtro;
    this.aplicarFiltro();
  }

  // ===== APLICAR FILTRO =====
  aplicarFiltro() {
    switch (this.filtroActivo) {
      case 'todos':
        this.favoritosFiltrados = [...this.favoritos];
        break;

      case 'disponibles':
        this.favoritosFiltrados = this.favoritos.filter(
          fav => fav.producto.disponible && fav.producto.cantidad_disponible > 0
        );
        break;

      case 'rebajados':
        this.favoritosFiltrados = this.favoritos.filter(
          fav => fav.producto.descuento > 0 || 
                 (fav.producto.precio_anterior && fav.producto.precio_anterior > fav.producto.precio)
        );
        break;

      case 'recientes':
        this.favoritosFiltrados = [...this.favoritos].sort((a, b) => {
          return new Date(b.fecha_agregado).getTime() - new Date(a.fecha_agregado).getTime();
        });
        break;

      default:
        this.favoritosFiltrados = [...this.favoritos];
    }
  }

  // ===== ELIMINAR FAVORITO =====
  eliminarFavorito(idFavorito: number, event: Event) {
    event.stopPropagation();

    if (!confirm('¿Eliminar este producto de tus favoritos?')) return;

    this.http.delete(`${this.apiUrl}/favoritos/${idFavorito}`).subscribe({
      next: () => {
        this.favoritos = this.favoritos.filter(fav => fav.id_favorito !== idFavorito);
        this.contadorFavoritos = this.favoritos.length;
        this.aplicarFiltro();
        window.dispatchEvent(new Event('favoritosActualizado'));
      },
      error: (error) => {
        console.error('Error al eliminar favorito:', error);
        alert('Error al eliminar el favorito. Intenta de nuevo.');
      }
    });
  }

  // ===== CONFIRMAR ELIMINAR TODOS =====
  confirmarEliminarTodos() {
    this.mostrarModalConfirmacion = true;
  }

  // ===== ELIMINAR TODOS LOS FAVORITOS =====
  eliminarTodosFavoritos() {
    this.http.delete(`${this.apiUrl}/favoritos/usuario/${this.userId}`).subscribe({
      next: () => {
        this.favoritos = [];
        this.favoritosFiltrados = [];
        this.contadorFavoritos = 0;
        this.cerrarModal();
        window.dispatchEvent(new Event('favoritosActualizado'));
      },
      error: (error) => {
        console.error('Error al eliminar favoritos:', error);
        alert('Error al eliminar los favoritos. Intenta de nuevo.');
        this.cerrarModal();
      }
    });
  }

  // ===== AGREGAR AL CARRITO =====
  agregarAlCarrito(producto: Producto, event: Event) {
    event.stopPropagation();

    if (!this.userId) {
      alert('Debes iniciar sesión para agregar productos al carrito');
      this.router.navigate(['/login']);
      return;
    }

    const item = {
      id_producto: producto.id_producto,
      cantidad: 1,
      color: null,
      talla: null,
      precio_unitario: producto.precio
    };

    this.http.post(`${this.apiUrl}/carrito/?id_usuario=${this.userId}`, item).subscribe({
      next: () => {
        alert(`${producto.nombre} agregado al carrito`);
        this.cargarContadorCarrito();
        window.dispatchEvent(new Event('carritoActualizado'));
      },
      error: (error) => {
        console.error('Error al agregar al carrito:', error);
        if (error.status === 400) {
          alert('Este producto ya está en tu carrito');
        } else {
          alert('Error al agregar al carrito. Intenta de nuevo.');
        }
      }
    });
  }

  // ===== BÚSQUEDA =====
  buscarProducto() {
    if (this.busqueda.trim() === '') return;
    this.router.navigate(['/'], { queryParams: { q: this.busqueda } });
  }

  // ===== NAVEGACIÓN =====
  verDetalleProducto(idProducto: number) {
    this.router.navigate(['/producto', idProducto]);
  }

  irInicio() {
    this.router.navigate(['/']);
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  irPerfil() {
    this.userMenuOpen = false;
    this.router.navigate(['/perfil']);
  }

  irVender() {
    this.userMenuOpen = false;
    this.router.navigate(['/vender']);
  }

  irConfiguracion() {
    this.userMenuOpen = false;
    this.router.navigate(['/configuracion']);
  }

  // ===== MODAL =====
  cerrarModal() {
    this.mostrarModalConfirmacion = false;
  }

  // ===== MENÚ USUARIO =====
  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideUserInfo = target.closest('.user-info');
    
    if (!clickedInsideUserInfo && this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  // ===== LOGOUT =====
  logout() {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    this.router.navigate(['/login']);
  }
}