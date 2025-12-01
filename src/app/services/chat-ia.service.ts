import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatIAService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Obtener respuesta de IA para consulta sobre medicamentos
  obtenerRespuestaIA(pregunta: string, id_usuario: number): Observable<any> {
    const payload = {
      pregunta: pregunta,
      id_usuario: id_usuario
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.apiUrl}/chat-ia/respuesta`,
      payload,
      { headers }
    );
  }

  // Buscar productos basado en consulta de IA
  buscarProductosPorConsulta(consulta: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/productos/buscar`, {
      params: { q: consulta }
    });
  }

  // Obtener recomendaciones de medicamentos por síntoma
  obtenerRecomendacionesMedicamentos(sintoma: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/medicamentos/recomendaciones`, {
      params: { sintoma: sintoma }
    });
  }

  // Guardar historial de chat
  guardarHistorialChat(
    id_usuario: number,
    pregunta: string,
    respuesta: string
  ): Observable<any> {
    const payload = {
      id_usuario: id_usuario,
      pregunta: pregunta,
      respuesta: respuesta,
      fecha: new Date().toISOString()
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.apiUrl}/chat-ia/historial`,
      payload,
      { headers }
    );
  }

  // Obtener historial de chat del usuario
  obtenerHistorialChat(id_usuario: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chat-ia/historial/${id_usuario}`);
  }
}
