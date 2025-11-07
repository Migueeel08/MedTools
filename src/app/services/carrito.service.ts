import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ItemCarrito {
  id_carrito: number;
  id_usuario: number;
  id_producto: number;
  cantidad: number;
  color?: string;
  talla?: string;
  precio_unitario: number;
  fecha_agregado: string;
  fecha_actualizado: string;
  producto_nombre: string;
  producto_imagen: string;
  producto_disponible: boolean;
  producto_cantidad_disponible: number;
  subtotal: number;
}

export interface CarritoResumen {
  id_usuario: number;
  total_items: number;
  total_productos: number;
  subtotal: number;
  items: ItemCarrito[];
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private apiUrl = 'http://localhost:8000/api/carrito';
  
  // BehaviorSubject para contador en tiempo real
  private contadorSubject = new BehaviorSubject<number>(0);
  public contador$ = this.contadorSubject.asObservable();

  // BehaviorSubject para items del carrito
  private itemsSubject = new BehaviorSubject<ItemCarrito[]>([]);
  public items$ = this.itemsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarContador();
  }

  // ===== OBTENER CARRITO COMPLETO =====
  obtenerCarrito(idUsuario: number): Observable<CarritoResumen> {
    return this.http.get<CarritoResumen>(`${this.apiUrl}/usuario/${idUsuario}`)
      .pipe(
        tap(carrito => {
          this.itemsSubject.next(carrito.items);
          this.contadorSubject.next(carrito.total_productos);
        })
      );
  }

  // ===== AGREGAR AL CARRITO =====
  agregarAlCarrito(idUsuario: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}?id_usuario=${idUsuario}`, data)
      .pipe(
        tap(() => this.cargarContador(idUsuario))
      );
  }

  // ===== ACTUALIZAR CANTIDAD =====
  actualizarCantidad(idCarrito: number, idUsuario: number, cantidad: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${idCarrito}?id_usuario=${idUsuario}`,
      { cantidad }
    ).pipe(
      tap(() => this.cargarContador(idUsuario))
    );
  }

  // ===== ELIMINAR ITEM =====
  eliminarItem(idCarrito: number, idUsuario: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${idCarrito}?id_usuario=${idUsuario}`)
      .pipe(
        tap(() => this.cargarContador(idUsuario))
      );
  }

  // ===== VACIAR CARRITO =====
  vaciarCarrito(idUsuario: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuario/${idUsuario}`)
      .pipe(
        tap(() => {
          this.contadorSubject.next(0);
          this.itemsSubject.next([]);
        })
      );
  }

  // ===== CONTAR ITEMS =====
  contarItems(idUsuario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/count?id_usuario=${idUsuario}`);
  }

  // ===== CARGAR CONTADOR (privado) =====
  private cargarContador(idUsuario?: number) {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const userId = idUsuario || user.id;

      this.contarItems(userId).subscribe({
        next: (contador) => {
          this.contadorSubject.next(contador.total_productos);
        },
        error: (error) => {
          console.error('Error al cargar contador:', error);
        }
      });
    }
  }

  // ===== VERIFICAR DISPONIBILIDAD =====
  verificarDisponibilidad(idUsuario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/verificar?id_usuario=${idUsuario}`);
  }

  // ===== OBTENER CONTADOR ACTUAL =====
  getContadorActual(): number {
    return this.contadorSubject.value;
  }

  // ===== REFRESCAR CARRITO =====
  refrescarCarrito(idUsuario: number) {
    this.obtenerCarrito(idUsuario).subscribe({
      next: () => {},
      error: (error) => console.error('Error al refrescar carrito:', error)
    });
  }
}