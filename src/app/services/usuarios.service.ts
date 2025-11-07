import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = 'http://localhost:8000';
  
  private usuarioSubject = new BehaviorSubject<any>(null);
  public usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarUsuarioDesdeStorage();
  }

  get usuarioActual() {
    return this.usuarioSubject.value;
  }

  private cargarUsuarioDesdeStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      this.usuarioSubject.next(userData);
    }
  }

  setUsuarioActual(usuario: any) {
    this.usuarioSubject.next(usuario);
    localStorage.setItem('user', JSON.stringify(usuario));
  }

  // ✅ CORREGIDO: Agregar /api/ en la ruta
  actualizarUsuario(userId: number, datosUsuario: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('🔄 Actualizando usuario en:', `${this.apiUrl}/api/usuarios/${userId}`);
    console.log('📦 Datos a enviar:', datosUsuario);

    return this.http.put(
      `${this.apiUrl}/api/usuarios/${userId}`,  // ✅ Agregado /api/
      datosUsuario,
      { headers }
    ).pipe(
      tap((usuarioActualizado: any) => {
        console.log('✅ Respuesta del servidor:', usuarioActualizado);
        const currentUser = this.usuarioActual || {};
        const updatedUser = { ...currentUser, ...usuarioActualizado };
        this.setUsuarioActual(updatedUser);
      })
    );
  }

  // ✅ CORREGIDO: Agregar /api/ en la ruta de foto
  subirFotoPerfil(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(
      `${this.apiUrl}/api/usuarios/${userId}/foto`,  // ✅ Agregado /api/
      formData,
      { headers }
    );
  }

  // ✅ CORREGIDO: Agregar /api/ en obtener por email
  obtenerUsuarioPorEmail(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/usuarios/email/${email}`);  // ✅ Agregado /api/
  }

  // ✅ CORREGIDO: Agregar /api/ en obtener por ID
  obtenerUsuarioPorId(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/usuarios/${userId}`);  // ✅ Agregado /api/
  }

  // ✅ CORREGIDO: Agregar /api/ en eliminar usuario
  eliminarUsuario(userId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(
      `${this.apiUrl}/api/usuarios/${userId}`,  // ✅ Agregado /api/
      { headers }
    );
  }

  // 📍 MÉTODO PARA AGREGAR DIRECCIÓN
  agregarDireccion(userId: number, direccion: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    // ✅ Asegurar que id_usuario esté en el objeto
    // ✅ Convertir strings vacíos a null para campos opcionales
    const direccionConUsuario = {
      id_usuario: userId,
      calle: direccion.calle,
      numero_exterior: direccion.numero_exterior,
      numero_interior: direccion.numero_interior || null, // ✅ null si está vacío
      colonia: direccion.colonia,
      codigo_postal: direccion.codigo_postal,
      ciudad: direccion.ciudad,
      estado: direccion.estado,
      pais: direccion.pais || 'México',
      referencias: direccion.referencias || null // ✅ null si está vacío
    };

    console.log('📤 Enviando a API:', direccionConUsuario);

    return this.http.post(
      `${this.apiUrl}/api/direcciones`,
      direccionConUsuario,
      { headers }
    );
  }

  // ✅ CORREGIDO: Usar ruta correcta /api/direcciones/usuario/{id}
  obtenerDirecciones(userId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(
      `${this.apiUrl}/api/direcciones/usuario/${userId}`,  // ✅ Ruta correcta según el router
      { headers }
    );
  }

  // ✅ CORREGIDO: Eliminar dirección por ID directo
  eliminarDireccion(direccionId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(
      `${this.apiUrl}/api/direcciones/${direccionId}`,  // ✅ Ruta simplificada
      { headers }
    );
  }
}