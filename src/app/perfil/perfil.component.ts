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

  compras: any[] = [];
  cargando = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.cargarUsuario();
    this.cargarCompras();
    
    window.addEventListener('storage', () => {
      this.cargarUsuario();
      this.cargarCompras();
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

  cargarCompras() {
    if (!this.user.id) {
      console.warn('No hay ID de usuario disponible');
      return;
    }

    this.cargando = true;

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
      vendedor: producto.vendedor || producto.usuario?.nombre || 'Vendedor',
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

  verDetalleProducto(producto: any) {
    this.router.navigate(['/producto', producto.id]);
  }

  explorarProductos() {
    this.router.navigate(['/']);
  }
}