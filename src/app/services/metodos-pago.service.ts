import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MetodosPagoService {
  private apiUrl = 'http://localhost:8000/api/metodos-pago';

  constructor(private http: HttpClient) {}

  /**
   * Crear un nuevo método de pago
   */
  crearMetodoPago(idUsuario: number, metodoPago: any): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.post(`${this.apiUrl}/`, metodoPago, { params });
  }

  /**
   * Obtener todos los métodos de pago de un usuario
   */
  obtenerMetodosPago(idUsuario: number): Observable<any[]> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.get<any[]>(`${this.apiUrl}/`, { params });
  }

  /**
   * Obtener el método de pago predeterminado
   */
  obtenerMetodoPredeterminado(idUsuario: number): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.get(`${this.apiUrl}/predeterminado`, { params });
  }

  /**
   * Obtener un método de pago específico
   */
  obtenerMetodoPago(idMetodoPago: number, idUsuario: number): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.get(`${this.apiUrl}/${idMetodoPago}`, { params });
  }

  /**
   * Actualizar un método de pago
   */
  actualizarMetodoPago(idMetodoPago: number, idUsuario: number, datos: any): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.put(`${this.apiUrl}/${idMetodoPago}`, datos, { params });
  }

  /**
   * Establecer un método de pago como predeterminado
   */
  establecerPredeterminado(idMetodoPago: number, idUsuario: number): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.patch(`${this.apiUrl}/${idMetodoPago}/predeterminado`, {}, { params });
  }

  /**
   * Eliminar un método de pago
   */
  eliminarMetodoPago(idMetodoPago: number, idUsuario: number): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.delete(`${this.apiUrl}/${idMetodoPago}`, { params });
  }

  /**
   * Contar métodos de pago de un usuario
   */
  contarMetodosPago(idUsuario: number): Observable<any> {
    const params = new HttpParams().set('id_usuario', idUsuario.toString());
    return this.http.get(`${this.apiUrl}/count`, { params });
  }
}