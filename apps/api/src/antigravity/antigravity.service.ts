import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AntigravityService {
  private readonly logger = new Logger('AntigravityService');

  async streamAIContent(prompt: string) {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    const PROJECT_ID = "ltdcdhqixvbpdcitthqf"; // Confirmado en Doc 02
    
    // Intentaremos el endpoint de Vertex AI regionalizado para coincidir con nuestra latitud
    // us-central1 es el estándar para Gemini, pero forzaremos la versión v1beta
    const region = 'us-central1'; 
    const model = 'gemini-1.5-flash';

    // Construcción de URL de Vertex AI (SRE Audit 08: Coherencia)
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${region}/publishers/google/models/${model}:streamGenerateContent`;

    try {
      this.logger.log(`[ANTIGRAVITY] Handshake regionalizado: ${region}`);
      
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, // Requiere token de cuenta de servicio
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      return response.data;

    } catch (error: any) {
      // LOG CRÍTICO PARA SHERLOG
      if (error.response?.status === 404) {
        this.logger.error(`[404 NOT FOUND] La entidad no existe en ${region}. Probando fallback global...`);
        return this.fallbackGlobal(prompt, API_KEY);
      }
      throw new InternalServerErrorException('Falla total de Antigravity');
    }
  }

  private async fallbackGlobal(prompt: string, apiKey: string | undefined) {
    // Si el regional falla, usamos el endpoint de AI Studio (v1beta es vital)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    }, { responseType: 'stream' });
    return response.data;
  }
}
