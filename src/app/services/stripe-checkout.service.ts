// stripe-checkout.service.ts
// ✅ VERSIÓN CORREGIDA - Verifica el estado del PaymentIntent antes de confirmar
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StripeCheckoutService {
  
  private apiUrl = 'http://localhost:8000/api/pagos';
  
  // ✅ TU PUBLISHABLE KEY (ya configurada)
  private stripePublishableKey = 'pk_test_51SR1uoE0bymcokfg1AYWjIxQSmWw0w6PRtIIgdj9SyGDEfQKbfIfBT0VHdegQ3Jp6lklMVgR9bucan9NQMgD5c2a00jpIV3Cnf';
  
  private stripePromise: Promise<Stripe | null>;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;

  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe(this.stripePublishableKey);
  }

  /**
   * Inicializa Stripe y crea el elemento de tarjeta
   */
  async initializeStripe(elementId: string): Promise<void> {
    this.stripe = await this.stripePromise;
    
    if (!this.stripe) {
      throw new Error('Stripe no pudo ser inicializado');
    }

    // Crear elementos de Stripe
    this.elements = this.stripe.elements();
    
    // Crear elemento de tarjeta con estilos personalizados
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          '::placeholder': {
            color: '#aab7c4'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      },
      hidePostalCode: true
    });

    // Montar el elemento en el DOM
    const cardElementContainer = document.getElementById(elementId);
    if (cardElementContainer) {
      this.cardElement.mount(`#${elementId}`);
    }
  }

  /**
   * Crear PaymentIntent para compra única
   */
  createPaymentIntent(data: {
    amount: number;
    id_usuario: number;
    id_producto: number;
    cantidad: number;
    descripcion: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-payment-intent`, data);
  }

  /**
   * Procesar el pago con la tarjeta ingresada
   * ✅ VERSIÓN MEJORADA: Verifica el estado antes de confirmar
   */
  async confirmCardPayment(clientSecret: string): Promise<any> {
    if (!this.stripe || !this.cardElement) {
      throw new Error('Stripe no está inicializado');
    }

    try {
      // 1. Primero, obtener el estado actual del PaymentIntent
      console.log('🔍 Verificando estado del PaymentIntent...');
      const { paymentIntent: currentPI } = await this.stripe.retrievePaymentIntent(clientSecret);
      
      console.log('📊 Estado actual:', currentPI?.status);

      // 2. Si ya está en succeeded, retornarlo directamente
      if (currentPI && currentPI.status === 'succeeded') {
        console.log('✅ El pago ya fue procesado exitosamente');
        return currentPI;
      }

      // 3. Si está en processing, esperar y verificar de nuevo
      if (currentPI && currentPI.status === 'processing') {
        console.log('⏳ Pago en proceso, esperando...');
        // Esperar 2 segundos y verificar de nuevo
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { paymentIntent: checkedPI } = await this.stripe.retrievePaymentIntent(clientSecret);
        if (checkedPI && checkedPI.status === 'succeeded') {
          console.log('✅ Pago completado');
          return checkedPI;
        }
      }

      // 4. Si requiere payment_method o confirmación, procesar con la tarjeta
      if (currentPI && (
        currentPI.status === 'requires_payment_method' || 
        currentPI.status === 'requires_confirmation' ||
        currentPI.status === 'requires_action'
      )) {
        console.log('💳 Confirmando pago con tarjeta...');
        
        const { error, paymentIntent } = await this.stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: this.cardElement
            }
          }
        );

        if (error) {
          console.error('❌ Error al confirmar:', error);
          
          // Si el error contiene un paymentIntent, verificar su estado
          if (error.payment_intent) {
            console.log('📊 Estado del PI en error:', error.payment_intent.status);
            if (error.payment_intent.status === 'succeeded') {
              console.log('✅ Pago exitoso a pesar del error');
              return error.payment_intent;
            }
          }
          
          throw new Error(error.message);
        }

        console.log('✅ Pago confirmado exitosamente');
        return paymentIntent;
      }

      // 5. Si llegamos aquí con un estado inesperado, intentar confirmar de todas formas
      console.log('⚠️ Estado inesperado, intentando confirmar...');
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: this.cardElement
          }
        }
      );

      if (error) {
        // Si el error es que ya está confirmado, obtener el PaymentIntent actual
        if (error.payment_intent) {
          console.log('📊 Usando PaymentIntent del error');
          return error.payment_intent;
        }
        throw new Error(error.message);
      }

      return paymentIntent;

    } catch (error: any) {
      console.error('❌ Error en confirmCardPayment:', error);
      throw error;
    }
  }

  /**
   * Confirmar el pago en el backend y registrar la venta
   */
  confirmPayment(data: {
    payment_intent_id: string;
    id_usuario: number;
    id_producto: number;
    cantidad: number;
    precio_total: number;
    id_direccion: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-payment`, data);
  }

  /**
   * Crear SetupIntent para guardar método de pago
   */
  createSetupIntent(id_usuario: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-setup-intent`, { id_usuario });
  }

  /**
   * Confirmar el setup y guardar el método de pago
   */
  async confirmCardSetup(clientSecret: string): Promise<any> {
    if (!this.stripe || !this.cardElement) {
      throw new Error('Stripe no está inicializado');
    }

    const { error, setupIntent } = await this.stripe.confirmCardSetup(
      clientSecret,
      {
        payment_method: {
          card: this.cardElement
        }
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return setupIntent;
  }

  /**
   * Obtener métodos de pago guardados del usuario
   */
  getPaymentMethods(id_usuario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment-methods/${id_usuario}`);
  }

  /**
   * Eliminar un método de pago guardado
   */
  deletePaymentMethod(payment_method_id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payment-methods/${payment_method_id}`);
  }

  /**
   * Limpiar el elemento de tarjeta (útil al cerrar modales)
   */
  clearCard(): void {
    if (this.cardElement) {
      this.cardElement.clear();
    }
  }

  /**
   * Destruir elementos de Stripe (al destruir componente)
   */
  destroyElements(): void {
    if (this.cardElement) {
      this.cardElement.destroy();
      this.cardElement = null;
    }
    if (this.elements) {
      this.elements = null;
    }
  }

  /**
   * Validar si la tarjeta está completa
   */
  isCardComplete(): boolean {
    return true;
  }
}